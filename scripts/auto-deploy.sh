#!/bin/bash
# scripts/auto-deploy.sh
#
# main 브랜치 변경을 감지하여 자동으로 배포하는 스크립트
# cron에 등록하여 주기적으로 실행합니다
#
# main = 배포 가지다. dev 에서 검사가 끝난 것만 PR 로 main 에 들어오고,
# 들어오는 순간 이 스크립트가 물어 배포한다 (2026-09-14 에 production 에서 옮김).
# 그래서 main 에 push 하는 것은 곧 배포하는 것이다.
#
# ⚠ weaver2 저장소 자신은 보일러플레이트라 붙은 서버가 없다. 이 스크립트는
#   파생 프로젝트가 자기 서버에 얹어 쓰는 틀이다 — APP_DIR·REPO_URL·PM2_APP_NAME
#   을 그 프로젝트 것으로 바꿔서 쓴다.
#
# [cron 등록 방법]
#   crontab -e
#   → * * * * * /bin/bash /app/weaver2/scripts/auto-deploy.sh
#      (1분마다 실행. 숫자를 바꾸면 주기 조정 가능)
#
# [로그 확인]
#   tail -f /var/log/weaver2-deploy.log
#
# [배포 순서와 그 이유]
#   받기 → 설치 → 클라이언트 생성 → 빌드 → 마이그레이션 → 재시작
#   - 어느 단계든 실패하면 **거기서 멈추고 재시작하지 않는다.** 돌던 프로세스는
#     메모리에 올라간 옛 코드로 계속 돈다. dist 는 직전 배포본으로 되돌린다
#     (node_modules 는 되돌리지 못한다 — 실패 로그가 그 사실을 적는다).
#   - 마이그레이션은 빌드가 성공한 뒤에 돈다. 빌드가 깨진 커밋 때문에 DB 만 앞서
#     나가 옛 코드가 새 스키마를 무는 일을 막는다.
#   - 마이그레이션을 빼먹으면 새 코드가 없는 컬럼을 물고 500 을 낸다. 예전에는
#     이 단계가 없어 사람이 서버에 들어가 손으로 돌려야 했다.
#
# [어디까지 배포됐는지]
#   git 참조 두 개로 적는다 (작업 트리를 더럽히지 않고, 원자적으로 바뀐다):
#     refs/deploy/current — 마지막으로 재시작까지 끝난 커밋
#     refs/deploy/failed  — 마지막으로 실패한 커밋 (같은 커밋을 1분마다 다시 시도해
#                           로그를 덮지 않게 한다. 고친 커밋이 main 에 오면 그걸 시도한다)
#   실패한 커밋을 그대로 다시 시도하려면: git update-ref -d refs/deploy/failed

set -uo pipefail

# ================================================================
# 설정값 (setup.sh 의 설정값과 동일하게 맞추세요)
# ================================================================
APP_DIR="/app/weaver2"
BRANCH="main"
PM2_APP_NAME="weaver2-core"
LOG_FILE="/var/log/weaver2-deploy.log"
# ================================================================

cd "$APP_DIR" || exit 1

# 빌드는 1분을 넘기기 쉽다. cron 이 다음 회차를 띄워도 겹쳐 돌지 않게 잠근다.
# flock 은 util-linux 의 것이다 (리눅스 서버 전제).
exec 9>"$APP_DIR/.git/auto-deploy.lock"
flock -n 9 || exit 0

# 🔴 NODE_ENV=production 은 **앱 프로세스에만** 준다 (맨 아래 pm2 restart).
#   이걸 안 하면 apps/core-backend/.env 의 NODE_ENV=development 가 dotenv 로
#   process.env 에 채워져, 프로덕션에서 보안 동작이 조용히 꺼진다:
#     · 인증 쿠키(access_token·refresh_token)·CSRF 쿠키의 secure 플래그
#     · CSRF 쿠키의 __Host- 접두사
#     · 스로틀(무차별 대입 방어)  ※ 스로틀은 THROTTLE_DISABLED 로도 이중 보호됨
#   @nestjs/config 는 process.env 를 .env 보다 우선하므로 pm2 env 로 주면 production 이 이긴다.
#   (docker 배포는 compose 가 이미 세운다)
#   ⚠ 스크립트 전체에 export 하지 않는다. pnpm install 이 NODE_ENV=production 을 --prod 로
#     읽어 devDependencies(prisma·@nestjs/cli·typescript)를 지우고, 바로 다음 db:generate·
#     build 가 깨진다.

DIST_BACKUP="$APP_DIR/dist.prev"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# 빌드 전 dist 를 떠 둔다. nest build 는 dist 를 먼저 비우므로(deleteOutDir), 실패하면
# 돌던 프로세스가 pm2 자동 재시작(크래시·재부팅) 때 빈 dist 로 뜬다.
backup_dist() {
  rm -rf "$DIST_BACKUP"
  if [ -d dist ]; then cp -a dist "$DIST_BACKUP"; fi
}

# 한 단계를 돌리고, 실패하면 그 커밋을 실패로 적고 끝낸다 (재시작 없이)
run_step() {
  local label=$1
  shift
  log "$label"
  # 9>&- : 잠금 fd 를 자식에게 물려주지 않는다. pm2 가 데몬을 새로 띄우면 그 데몬이
  #        fd 를 쥔 채 살아 남아, 이후 cron 회차가 전부 「잠김」으로 조용히 끝난다.
  if ! "$@" 9>&- >> "$LOG_FILE" 2>&1; then
    log "❌ 실패: $label — 재시작하지 않습니다"
    if [ -d "$DIST_BACKUP" ]; then
      rm -rf dist && mv "$DIST_BACKUP" dist
      log "↩️  dist 를 직전 배포본으로 되돌렸습니다"
    fi
    log "   돌던 프로세스는 메모리의 옛 코드로 계속 돕니다. node_modules 는 새 커밋 기준으로"
    log "   바뀌었을 수 있으니, 고칠 때까지 pm2 를 손으로 재시작하지 마세요"
    git update-ref refs/deploy/failed "$REMOTE_HASH"
    echo "======================================" >> "$LOG_FILE"
    exit 1
  fi
}

# 원격 최신 상태 조회
if ! git fetch origin "$BRANCH" --quiet 2>> "$LOG_FILE"; then
  log "⚠️  git fetch 실패 — 다음 회차에 다시 봅니다"
  exit 1
fi

REMOTE_HASH=$(git rev-parse "origin/$BRANCH")
# 참조가 없는 서버(이 방식 이전에 세운 서버)는 지금 HEAD 를 배포된 것으로 본다
DEPLOYED_HASH=$(git rev-parse --verify --quiet refs/deploy/current || git rev-parse HEAD)
FAILED_HASH=$(git rev-parse --verify --quiet refs/deploy/failed || true)

# 이미 배포했거나, 이미 실패한 커밋이면 조용히 끝낸다
if [ "$REMOTE_HASH" = "$DEPLOYED_HASH" ] || [ "$REMOTE_HASH" = "$FAILED_HASH" ]; then
  exit 0
fi

echo "" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"
log "🔄 변경 감지"
echo "  배포됨: $DEPLOYED_HASH" >> "$LOG_FILE"
echo "  최신  : $REMOTE_HASH" >> "$LOG_FILE"

# fast-forward 만 받는다. 서버에서 누가 손으로 커밋했으면 합치지 않고 멈춘다.
# 브랜치 이름이 아니라 위에서 고른 커밋을 받는다 — 받은 것과 기록하는 것이 같아야 한다.
run_step "📥 코드 업데이트 중..." git merge --ff-only "$REMOTE_HASH"
run_step "📦 패키지 설치 중..." pnpm install --frozen-lockfile
run_step "🗄️  Prisma 클라이언트 생성 중..." pnpm db:generate
backup_dist
run_step "🏗️  빌드 중..." pnpm build:core
run_step "🧬 DB 마이그레이션 중..." pnpm db:deploy

# --update-env: pm2 restart 는 기본적으로 처음 start 때 잡은 env 를 재사용한다.
# 여기서 준 NODE_ENV=production 을 실제로 반영하려면 이 플래그가 필요하다.
run_step "🚀 PM2 재시작 중..." env NODE_ENV=production pm2 restart "$PM2_APP_NAME" --update-env

rm -rf "$DIST_BACKUP"
git update-ref refs/deploy/current "$REMOTE_HASH"
git update-ref -d refs/deploy/failed 2>/dev/null || true
log "✅ 배포 완료"
echo "======================================" >> "$LOG_FILE"
