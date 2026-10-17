#!/bin/bash
# scripts/setup.sh
#
# 서버 최초 배포 때 쓰는 스크립트 (.env 를 채우느라 두 번 돈다 — 아래 [실행 방법])
#
# [사전 준비 - SSH 인증]
# private 레포인 경우, 아래 절차를 먼저 진행하세요:
#   1. ssh-keygen -t ed25519 -C "your-email@example.com"
#   2. cat ~/.ssh/id_ed25519.pub  (공개키 복사)
#   3. GitHub 레포 → Settings → Deploy keys → Add deploy key (붙여넣기)
#   4. 연결 테스트: ssh -T git@github.com
#
# [사전 준비 - 의존성]
#   - git, node, pnpm, pm2 설치 필요
#   - pm2 설치: npm install -g pm2
#
# [사전 준비 - 리버스 프록시] (이 저장소에 nginx 설정은 없다 — 서버에서 직접 둔다)
#   백엔드는 TRUST_PROXY(기본 loopback)로 같은 호스트 프록시의 X-Forwarded-For 를 믿어
#   req.ip(스로틀 버킷·로그인 IP)를 정한다. Next.js rewrite(/api → 백엔드)는 XFF 가
#   있으면 손대지 않고 넘기므로, 앞단 nginx 가 클라이언트 값을 **덮어써야** 위조가 막힌다:
#     proxy_set_header X-Forwarded-For $remote_addr;   # $proxy_add_x_forwarded_for 아님
#     proxy_set_header X-Real-IP       $remote_addr;
#   nginx 없이 Next 를 바로 노출하면 클라이언트가 XFF 로 IP 를 고를 수 있다.
#
# [실행 방법]
#   bash scripts/setup.sh        # 처음: 클론하고 .env 를 만든 뒤 멈춘다
#   (apps/core-backend/.env 의 비밀값을 채운다)
#   bash /app/weaver2/scripts/setup.sh   # 다시: 빌드·마이그레이션·실행까지 간다
#
# [.env 를 서버에 두는 것에 대해]
#   .env 파일 자체는 결함이 아니다. 결함은 다른 계정이 그 파일을 읽을 수 있는 것이다
#   (JWT_SECRET 하나로 아무 사용자의 토큰이나 찍을 수 있다). 그래서 이 스크립트는
#   .env 를 소유자만 읽는 600 으로 만들고, 다시 돌 때마다 600 으로 되돌린다.
#   백엔드도 부팅 때 권한을 재서 열려 있으면 경고한다.
#   앱은 그 파일을 소유한 계정으로 돌린다 (root 로 돌리지 않는다).

set -euo pipefail

# ================================================================
# 설정값 (실제 배포 환경에 맞게 수정하세요)
# ================================================================
APP_DIR="/app/weaver2"
REPO_URL="git@github.com:your-org/weaver2.git"   # SSH URL
BRANCH="main"
PM2_APP_NAME="weaver2-core"
# ================================================================

ENV_FILE="$APP_DIR/apps/core-backend/.env"
# 비어 있으면 서버가 서지 않거나(JWT_SECRET) 2FA 가 깨지는(TOTP_ENCRYPTION_KEY) 값들
REQUIRED_SECRETS=(JWT_SECRET TOTP_ENCRYPTION_KEY)

echo "======================================"
echo "  Weaver2 서버 초기 설정"
echo "======================================"
echo "배포 경로 : $APP_DIR"
echo "레포지토리: $REPO_URL"
echo "브랜치    : $BRANCH"
echo ""

# 이미 돌고 있는 서버면 중단 — 그다음부터는 auto-deploy.sh 의 일이다
if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
  echo "⚠️  PM2 에 $PM2_APP_NAME 이 이미 있습니다."
  echo "   이미 초기화된 서버입니다. auto-deploy.sh 를 사용하세요."
  exit 1
fi

# 1) 레포 클론 (처음 한 번만)
if [ ! -d "$APP_DIR" ]; then
  echo "📦 레포지토리 클론 중..."
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  echo "❌ $APP_DIR 가 있지만 git 저장소가 아닙니다. 비우거나 다른 경로를 쓰세요."
  exit 1
fi

# 2) .env — 없으면 틀에서 만들고, 채우도록 멈춘다
if [ ! -f "$ENV_FILE" ]; then
  # umask 로 만들 때부터 600 이다. cp 뒤에 chmod 하면 그 사이에 644 로 잠깐 열린다.
  (umask 077 && cp "$APP_DIR/apps/core-backend/.env.example" "$ENV_FILE")
  # 틀은 로컬 개발용 development 다. 서버 파일은 처음부터 production 으로 둔다
  # (pm2 도 NODE_ENV=production 을 세우지만, 파일과 프로세스가 다른 말을 하지 않게).
  sed -i.bak 's/^NODE_ENV=.*/NODE_ENV=production/' "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  echo ""
  echo "📝 $ENV_FILE 을 만들었습니다 (권한 600)."
  echo "   비밀값(${REQUIRED_SECRETS[*]})·DATABASE_URL·CLIENT_URL 등을 채운 뒤"
  echo "   이 스크립트를 다시 실행하세요:  bash $APP_DIR/scripts/setup.sh"
  exit 0
fi
chmod 600 "$ENV_FILE"

# 3) 필수 비밀값이 비어 있으면 빌드 전에 멈춘다
missing=()
for key in "${REQUIRED_SECRETS[@]}"; do
  grep -Eq "^${key}=.+" "$ENV_FILE" || missing+=("$key")
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ $ENV_FILE 에 비어 있는 필수 값: ${missing[*]}"
  echo "   임의의 긴 값: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  exit 1
fi
# 틀의 개발용 DB 주소가 그대로면 알린다 (막지는 않는다 — 같은 값을 일부러 쓸 수도 있다)
if grep -q '^DATABASE_URL=postgresql://weaver:weaver1234@' "$ENV_FILE"; then
  echo "⚠️  DATABASE_URL 이 .env.example 의 개발용 값 그대로입니다 (weaver1234). 의도한 것인지 확인하세요."
fi

# 의존성 설치
echo "📥 패키지 설치 중..."
pnpm install --frozen-lockfile

# Prisma 클라이언트 생성
echo "🗄️  Prisma 클라이언트 생성 중..."
pnpm db:generate

# 빌드
echo "🏗️  빌드 중..."
pnpm build:core

# DB 마이그레이션 — 🔴 db:migrate(prisma migrate dev)가 아니라 db:deploy 다.
#   migrate dev 는 개발용이라 스키마가 어긋나면 DB 를 리셋하자고 하거나 새 마이그레이션을
#   만든다. 서버는 저장소에 있는 마이그레이션을 순서대로 적용만 한다.
echo "🧬 DB 마이그레이션 중..."
pnpm db:deploy

# PM2로 실행
# 🔴 NODE_ENV=production 을 명시적으로 세운다. 안 그러면 apps/core-backend/.env 의
#    NODE_ENV=development 가 dotenv 로 채워져 프로덕션에서 쿠키 secure·CSRF __Host-·
#    스로틀이 조용히 꺼진다. (@nestjs/config 는 process.env 를 .env 보다 우선한다.)
echo "🚀 PM2로 앱 시작 중..."
NODE_ENV=production pm2 start dist/apps/core-backend/main.js --name "$PM2_APP_NAME"
# auto-deploy.sh 가 「어디까지 배포됐는지」를 여기서부터 이어 받는다
git update-ref refs/deploy/current HEAD
pm2 save
# 서버 재시작 시 자동 실행 등록. root 가 아니면 sudo 로 칠 명령만 출력하고 0 이 아닌 값으로
# 끝날 수 있다 — 그 명령을 손으로 친다.
pm2 startup || echo "⚠️  위에 출력된 sudo 명령을 실행해 부팅 시 자동 실행을 등록하세요."

echo ""
echo "======================================"
echo "  ✅ 초기 설정 완료!"
echo "======================================"
echo ""
echo "다음 단계:"
echo "  1. 자동 배포 cron 등록: crontab -e"
echo "     → * * * * * /bin/bash $APP_DIR/scripts/auto-deploy.sh"
echo ""
