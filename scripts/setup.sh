#!/bin/bash
# scripts/setup.sh
#
# 서버 최초 배포 시 딱 한 번 실행하는 스크립트
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
# [실행 방법]
#   chmod +x scripts/setup.sh
#   bash scripts/setup.sh

set -e  # 오류 발생 시 즉시 중단

# ================================================================
# 설정값 (실제 배포 환경에 맞게 수정하세요)
# ================================================================
APP_DIR="/app/weaver2"
REPO_URL="git@github.com:your-org/weaver2.git"   # SSH URL
BRANCH="production"
PM2_APP_NAME="weaver2-core"
# ================================================================

echo "======================================"
echo "  Weaver2 서버 초기 설정 시작"
echo "======================================"
echo "배포 경로 : $APP_DIR"
echo "레포지토리: $REPO_URL"
echo "브랜치    : $BRANCH"
echo ""

# 이미 설치된 경우 중단
if [ -d "$APP_DIR" ]; then
  echo "⚠️  $APP_DIR 가 이미 존재합니다."
  echo "   이미 초기화된 서버입니다. auto-deploy.sh 를 사용하세요."
  exit 1
fi

# 레포 클론
echo "📦 레포지토리 클론 중..."
git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# 의존성 설치
echo "📥 패키지 설치 중..."
pnpm install --frozen-lockfile

# Prisma 클라이언트 생성
echo "🗄️  Prisma 클라이언트 생성 중..."
pnpm db:generate

# 빌드
echo "🏗️  빌드 중..."
pnpm build:core

# PM2로 실행
echo "🚀 PM2로 앱 시작 중..."
pm2 start dist/apps/core-backend/main.js --name "$PM2_APP_NAME"
pm2 save
pm2 startup  # 서버 재시작 시 자동 실행 등록

echo ""
echo "======================================"
echo "  ✅ 초기 설정 완료!"
echo "======================================"
echo ""
echo "다음 단계:"
echo "  1. .env 파일을 $APP_DIR/apps/core-backend/.env 에 생성하세요"
echo "  2. DB 마이그레이션: cd $APP_DIR && pnpm db:migrate"
echo "  3. 자동 배포 cron 등록: crontab -e"
echo "     → * * * * * /bin/bash $APP_DIR/scripts/auto-deploy.sh"
echo ""
