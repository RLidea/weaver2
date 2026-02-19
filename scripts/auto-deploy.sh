#!/bin/bash
# scripts/auto-deploy.sh
#
# production 브랜치 변경을 감지하여 자동으로 배포하는 스크립트
# cron에 등록하여 주기적으로 실행합니다
#
# [cron 등록 방법]
#   crontab -e
#   → * * * * * /bin/bash /app/weaver2/scripts/auto-deploy.sh
#      (1분마다 실행. 숫자를 바꾸면 주기 조정 가능)
#
# [로그 확인]
#   tail -f /var/log/weaver2-deploy.log

# ================================================================
# 설정값 (setup.sh 의 설정값과 동일하게 맞추세요)
# ================================================================
APP_DIR="/app/weaver2"
BRANCH="production"
PM2_APP_NAME="weaver2-core"
LOG_FILE="/var/log/weaver2-deploy.log"
# ================================================================

cd "$APP_DIR" || exit 1

# 원격 최신 상태 조회
git fetch origin "$BRANCH" --quiet

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse "origin/$BRANCH")

# 변경 없으면 종료
if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  exit 0
fi

echo "" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 변경 감지" >> "$LOG_FILE"
echo "  이전: $LOCAL_HASH" >> "$LOG_FILE"
echo "  최신: $REMOTE_HASH" >> "$LOG_FILE"

# 배포 시작
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📥 코드 업데이트 중..." >> "$LOG_FILE"
git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📦 패키지 설치 중..." >> "$LOG_FILE"
pnpm install --frozen-lockfile >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🗄️  Prisma 클라이언트 생성 중..." >> "$LOG_FILE"
pnpm db:generate >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🏗️  빌드 중..." >> "$LOG_FILE"
pnpm build:core >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 PM2 재시작 중..." >> "$LOG_FILE"
pm2 restart "$PM2_APP_NAME" >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ 배포 완료" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"
