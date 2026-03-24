#!/bin/bash
# scripts/init.sh
#
# 새 프로젝트 시작 시 최초 1회 실행하는 초기화 스크립트
# 사용법: pnpm run init

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

log_step() { echo -e "\n${BOLD}▶ $1${RESET}"; }
log_ok()   { echo -e "  ${GREEN}✔ $1${RESET}"; }
log_skip() { echo -e "  ${YELLOW}⊘ $1${RESET}"; }
log_warn() { echo -e "  ${RED}⚠ $1${RESET}"; }

echo -e "${BOLD}"
echo "  ╔═══════════════════════════════╗"
echo "  ║     Weaver2 Project Init      ║"
echo "  ╚═══════════════════════════════╝"
echo -e "${RESET}"

# ─────────────────────────────────────
# 1. .env 파일 생성
# ─────────────────────────────────────
log_step "환경 변수 파일 설정"

if [ ! -f apps/core-backend/.env ]; then
  cp apps/core-backend/.env.example apps/core-backend/.env
  log_ok "apps/core-backend/.env 생성 완료"
  log_warn "DATABASE_URL, JWT_SECRET 등 필수 값을 apps/core-backend/.env 에 입력해주세요"
else
  log_skip "apps/core-backend/.env 이미 존재 (스킵)"
fi

if [ ! -f apps/core-frontend/.env.local ]; then
  cp apps/core-frontend/.env.example apps/core-frontend/.env.local
  log_ok "apps/core-frontend/.env.local 생성 완료"
else
  log_skip "apps/core-frontend/.env.local 이미 존재 (스킵)"
fi

# ─────────────────────────────────────
# 2. 패키지 설치
# ─────────────────────────────────────
log_step "패키지 설치 (pnpm install)"
pnpm install
log_ok "패키지 설치 완료"

# ─────────────────────────────────────
# 3. DATABASE_URL 확인
# ─────────────────────────────────────
source apps/core-backend/.env 2>/dev/null || true

if [[ -z "$DATABASE_URL" || "$DATABASE_URL" == *"<"* ]]; then
  echo ""
  log_warn "DATABASE_URL이 설정되지 않았습니다."
  echo -e "  apps/core-backend/.env 에서 아래 항목을 먼저 설정해주세요:\n"
  echo -e "    DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<db>"
  echo ""
  echo -e "  설정 후 아래 명령어를 직접 실행해주세요:"
  echo -e "    pnpm db:core:generate"
  echo -e "    pnpm db:core:migrate"
  echo -e "    pnpm db:core:seed"
  exit 0
fi

# ─────────────────────────────────────
# 4. Prisma 클라이언트 생성
# ─────────────────────────────────────
log_step "Prisma 클라이언트 생성"
pnpm db:core:generate
log_ok "Prisma 클라이언트 생성 완료"

# ─────────────────────────────────────
# 5. 마이그레이션
# ─────────────────────────────────────
log_step "DB 마이그레이션"
pnpm db:core:migrate
log_ok "마이그레이션 완료"

# ─────────────────────────────────────
# 6. 시드 데이터
# ─────────────────────────────────────
log_step "시드 데이터 삽입"
pnpm db:core:seed
log_ok "시드 데이터 삽입 완료"

# ─────────────────────────────────────
# 완료
# ─────────────────────────────────────
echo -e "\n${GREEN}${BOLD}  ✔ 초기화 완료! 이제 개발 서버를 시작할 수 있습니다.${RESET}"
echo -e "  ${BOLD}pnpm dev${RESET}\n"
