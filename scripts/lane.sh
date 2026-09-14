#!/usr/bin/env bash
#
# scripts/lane.sh — 병렬 개발 「레인」 관리
#
# ────────────────────────────────────────────────────────────────
# 출처
#
#   이 파일은 vands-crm-v1/scripts/lane.sh 를 weaver2 로 옮긴 것이다 (2026-09-14).
#   포트·앱 이름·명령은 weaver2 에 맞춰 고쳤다.
#
#   🔴 주석 속 「실측」과 날짜가 붙은 실패 기록은 **그 저장소에서 잰 값**이다.
#      weaver2 에서 다시 재지 않았다. 교훈은 그대로 서지만 수치는 그 집의 것이다.
#      weaver2 에서 잰 값에는 「weaver2 실측」이라고 따로 적는다.
#
# ────────────────────────────────────────────────────────────────
# 왜 있는가
#
#   세션 다섯이 각자 풀스택(Next + Nest)을 띄우면 이 맥에서 스왑이 난다.
#   실측: next-server 하나가 RSS 1.7GB, RAM 24GB. 5벌이면 10~17GB 에
#   Claude Code 다섯과 브라우저가 얹힌다.
#
#   그래서 「세션 수」와 「도는 서버 수」를 떼어놓는다.
#
#     편집 레인 (기본)   워크트리만. 서버 0, 포트 0.
#                        검증은 pnpm typecheck · lint · test 로 한다.
#
#     런타임 레인 (1벌)  저장소 루트에서 pnpm dev:web(3000) + pnpm dev:core(4000).
#                        화면이 필요하면 여기에 브랜치를 체크아웃해서 본다.
#                        e2e 도 여기에 붙는다 (E2E_BASE_URL·E2E_NO_WEBSERVER).
#
#   백엔드 지정은 .env.local 의 API_URL 한 줄이면 된다. 다만 CORS 는 공짜가
#   아니다 — 프론트가 next.config.ts 의 rewrites 로 프록시를 하더라도 브라우저의
#   Origin 헤더는 백엔드까지 그대로 전달된다 (vands 실측: 같은 URL 에 Origin 만 레인
#   포트로 바꾸면 200 → 500). 그래서 레인용 포트 대역 3001~3009 를 공용 백엔드의
#   ALLOWED_ORIGINS 에 미리 열어 둔다. 레인마다 고치는 게 아니라 한 번 열어 둔다.
#
# ────────────────────────────────────────────────────────────────
# 사용법
#
#   레인 하나 만드는 데 ~10초 (weaver2 실측 2026-09-14, pnpm 스토어가 따뜻한 상태.
#   worktree + pnpm install + db:generate 의 합이다).
#
#   pnpm lane:brief                지금 이 저장소가 어떤 상태인지 한 화면에.
#                                  새 세션은 일을 시작하기 전에 이걸 먼저 돌린다.
#
#   pnpm lane:new  <이름> [--branch <브랜치>] [--with-frontend] [--with-backend] [--isolated]
#   pnpm lane:e2e  <이름> [스펙…]  격리 레인에서 e2e 를 돌린다 — 켜고·재고·반드시 내린다
#
#   --isolated  자기 DB(공용을 통째 복사)와 자기 포트를 갖는다. e2e 가 서로를
#               안 밟으므로 여럿이 동시에 돌 수 있고, pnpm db:seed 도 마음껏 돌린다.
#               서버는 빌드본으로 켠다 — weaver2 실측 2026-09-14: 프론트 RSS 0.14GB,
#               DB 복제본 9.9MB (next dev 는 vands 실측 0.8~1.7GB).
#   pnpm lane:prep <이름> [--with-frontend] [--with-backend]
#   pnpm lane:ls
#   pnpm lane:rm   <이름> [--force]
#
#   화면 확인과 착륙 (런타임 레인에서만 — 편집 레인에서 쓰면 거절한다)
#
#   pnpm lane:show <이름>          그 레인 코드를 화면에 올린다 (git checkout --detach)
#   pnpm lane:back [--force]       제자리로. 보는 동안 만든 커밋이 있으면 멈추고 알린다
#   pnpm lane:land <이름> [--rm]   rebase 됐는지 확인하고 fast-forward 로 넣는다
#
#   착륙 순서는 「rebase 먼저, 그다음 확인, 그다음 머지」다. rebase 를 먼저 해야
#   레인에서 본 트리와 통합 브랜치에 들어갈 트리가 같아진다 (fast-forward).
#   lane:land 는 rebase 가 안 됐으면 거절해서 그 순서를 강제한다.
#
#   레인은 dev 로 착륙한다. main 은 내보내는 가지라 직접 쓰지 않는다 —
#   dev 에 모인 것을 PR dev→main 으로 올린다.
#   ⚠ 2026-09-14 현재 weaver2 의 CI(ci.yml)는 **main 만** 본다. dev 착륙분은
#     PR 을 열기 전까지 원격 검사를 안 받으므로, 레인에서 검증 3종을 돌리는 것이
#     지금은 유일한 관문이다.
#
#   --with-frontend  이 레인에 프론트 포트를 배정한다 (3001~3009 중 빈 것).
#                    화면 확인이 잦은 작업이 여럿일 때만. 백엔드는 계속 공유.
#
#   --with-backend   이 레인에 백엔드 포트를 배정하고 API_URL 을 그쪽으로 돌린다.
#                    ⚠ **포트만 가른다 — DATABASE_URL 은 공용 그대로다.**
#                    그래서 스키마를 바꾸는 레인에는 이것만으로 모자란다.
#
#   ★ prisma 스키마를 바꾸는 레인은 --isolated 를 쓴다 ★
#     공용 DB 에 migrate 를 걸면 다른 레인이 전부 그 스키마를 물고, 각자
#     pnpm db:generate 를 다시 하기 전까지 새 컬럼이 응답에서 조용히 빠진다.
#     --with-backend 는 「공용 백엔드 프로세스가 안 물린다」까지만 지켜 준다.
#
# ────────────────────────────────────────────────────────────────

set -euo pipefail

# ── 설정 ────────────────────────────────────────────────────────
INTEGRATION_BRANCH=dev            # 레인들이 모이는 곳. main 은 내보내는 가지라 직접 안 쓴다
                                  # (ci.yml 은 2026-09-14 현재 main 만 본다)
SHARED_BACKEND_PORT=4000          # 런타임 레인의 백엔드. 편집 레인은 전부 여길 본다
# 🔴 대역을 3001~ 이 아니라 **3010~ 에서 시작**한다 — 이 맥에는 vands-crm-v1 이 함께
#    살고, 그쪽 레인 대역이 3001~3009 · 4001~4009 다 (weaver2 실측 2026-09-14:
#    `lane:ls` 가 :3001·:4001 을 「이 저장소 밖에서 온 포트」로 잡아냈다).
#    겹치면 남의 개발 서버가 떠 있는 날 우리 e2e 가 `require_port_free` 에 막혀 선다 —
#    안전하게 서긴 하지만, 원인이 옆 저장소에 있어서 찾는 데 시간이 든다.
FRONTEND_PORT_RANGE="3010 3019"   # --with-frontend 가 고르는 범위 (3000 은 런타임 레인)
BACKEND_PORT_RANGE="4010 4019"    # --with-backend 가 고르는 범위 (4000 은 공유분)
RUNTIME_FRONTEND_PORT=3000        # 런타임 레인의 프론트. 화면은 여기서만 본다

# lane:ls · brief 가 훑는 범위. 위 대역 + 런타임 + 옆집 대역까지 본다 —
# 「우리 것이 아닌 포트」도 보여야 유령을 찾는다
SCAN_FRONTEND="3000 3019"
SCAN_BACKEND="4000 4019"

# 워크트리에 복사해야 하는 것들. 둘 다 .gitignore 라 체크아웃으로는 안 따라온다
ENV_FILES="apps/core-backend/.env apps/core-frontend/.env.local"


# ── 유틸 ────────────────────────────────────────────────────────
c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'
c_dim=$'\033[2m';  c_bld=$'\033[1m'; c_off=$'\033[0m'

die()  { printf '%s✗ %s%s\n' "$c_red" "$*" "$c_off" >&2; exit 1; }
ok()   { printf '%s✓%s %s\n' "$c_grn" "$c_off" "$*"; }
warn() { printf '%s! %s%s\n' "$c_ylw" "$*" "$c_off"; }
step() { printf '%s→%s %s\n' "$c_dim" "$c_off" "$*"; }

# 표 정렬용 패딩. printf %-Ns 는 글자 수를 세지만 한글은 두 칸을 차지한다.
# 한글 = 3바이트/1글자/2칸, ASCII = 1바이트/1글자/1칸 → 칸수 = 글자수 + (바이트수-글자수)/2.
# (그래서 이 표의 칸에는 폭이 애매한 ✓ · — 대신 한글이나 ASCII 만 쓴다)
pad() {
  local s=$1 w=$2 bytes chars disp i
  chars=${#s}
  bytes=$(printf '%s' "$s" | wc -c)
  disp=$(( chars + (bytes - chars) / 2 ))
  printf '%s' "$s"
  for (( i = disp; i < w; i++ )); do printf ' '; done
}

# 메인 워크트리 루트. 이 스크립트가 워크트리 안에서 불려도 저장소 원본을 가리킨다
main_root() {
  git worktree list --porcelain | awk '/^worktree /{ print substr($0, 10); exit }'
}

MAIN="$(main_root)" || die "git 저장소가 아닙니다"
[ -n "$MAIN" ] || die "메인 워크트리를 찾지 못했습니다"

# 통합 브랜치는 **로컬에** 있어야 한다. 없으면 `worktree add -b … <이름>` 이
# 「Needed a single revision」으로 죽는데, 그 말로는 원인이 안 보인다 —
# 원격에만 있는 가지는 rev-parse 가 못 푼다 (weaver2 실측 2026-09-14).
require_integration_branch() {
  git -C "$MAIN" show-ref --verify -q "refs/heads/$INTEGRATION_BRANCH" && return 0
  printf '%s✗ 통합 브랜치 「%s」 가 로컬에 없습니다%s\n\n' "$c_red" "$INTEGRATION_BRANCH" "$c_off" >&2
  if git -C "$MAIN" show-ref --verify -q "refs/remotes/origin/$INTEGRATION_BRANCH"; then
    printf '  원격에는 있습니다. 가져오세요:\n' >&2
    printf '    git branch %s origin/%s\n\n' "$INTEGRATION_BRANCH" "$INTEGRATION_BRANCH" >&2
    printf '  %s가져오기 전에 origin/%s 가 얼마나 뒤처졌는지 보세요 —%s\n' \
      "$c_dim" "$INTEGRATION_BRANCH" "$c_off" >&2
    printf '  %s  git rev-list --left-right --count origin/%s...origin/main%s\n' \
      "$c_dim" "$INTEGRATION_BRANCH" "$c_off" >&2
    printf '  %s뒤처진 가지에서 레인을 가르면 그 과거에서 시작합니다.%s\n\n' "$c_dim" "$c_off" >&2
  else
    printf '  원격에도 없습니다. scripts/lane.sh 의 INTEGRATION_BRANCH 를 고치세요.\n\n' >&2
  fi
  exit 1
}
WT_BASE="$MAIN/.claude/worktrees"
LANE_META="$MAIN/.claude/lanes"

lane_dir()  { printf '%s/%s' "$WT_BASE" "$1"; }
lane_meta() { printf '%s/%s.env' "$LANE_META" "$1"; }

# 포트가 LISTEN 중인가
port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

#
# 🔴 e2e 를 켜기 전에 **그 포트가 비었는지** 본다. 안 보면 남의 서버를 자기 것으로 안다.
#
# 2026-09-11 에 실제로 밟은 자리다. `lane:e2e` 는 서버를 이렇게 켠다:
#
#     ( … next start -p "$fe" ) >/dev/null 2>&1 &      ← 실패해도 소리가 안 난다
#     until curl -s "http://localhost:$fe/login"; do … ← 남의 서버가 답해도 통과한다
#
# 포트가 차 있으면 `next start` 는 EADDRINUSE 로 죽는데 출력이 버려지고, 바로 다음 줄의
# `curl` 은 **거기 있던 남의 서버가 답하니** 통과한다. 그래서 「프론트 준비」를 찍고
# **남의 트리에 대고** 시험을 돌린 뒤, 뒷정리에서 **남의 서버를 내린다.**
#
# 그날은 배포 관문 e2e 가 옆 세션의 개발 서버(:3009)를 잡았다. 449 통과가 내 release
# 가지가 아니라 그쪽 트리를 잰 것이었고, 그쪽 서버는 **공용 DB** 를 보고 있어서 새 시드에
# 기대는 시험 일곱이 붉었다. 🔵 **그 붉은 일곱이 아니었으면 그대로 배포했다.**
#
# 레인 포트는 장부에 **고정**이라(만들 때 정하고 안 바뀐다) 사람이 손으로 띄운 서버와
# 언제든 겹칠 수 있다. 그러니 겹침은 예외가 아니라 **정상적으로 일어나는 일**이고,
# 도구가 그때 멈춰 서야 한다.
#
require_port_free() {
  local p=$1 what=$2
  port_busy "$p" || return 0
  printf '\n%s✗%s %s 포트 :%s 가 이미 쓰이고 있습니다 — 남의 서버에 대고 시험을 돌릴 뻔했습니다.\n\n' \
    "$c_red" "$c_off" "$what" "$p"
  lsof -nP -iTCP:"$p" -sTCP:LISTEN 2>/dev/null | awk 'NR==1 || NR>1 {print "    " $0}' | head -5
  printf '\n  %s그 서버를 내리거나, 이 레인의 포트를 바꾸세요:%s\n' "$c_dim" "$c_off"
  printf '    %s\n' "$(lane_meta "$LANE_E2E_NAME") 의 FRONTEND_PORT / BACKEND_PORT"
  printf '\n'
  exit 1
}

#
# 켜 놓고 보니 **내가 켠 것이 맞나**. require_port_free 를 통과해도 경주가 남는다 —
# 옆 세션이 같은 순간에 같은 포트를 골랐을 수 있다. 그래서 뜬 뒤에 한 번 더 본다.
#
# 자는 **메모리**다. 실측(CLAUDE.md): `next start` 0.15GB · `next dev` 0.8~1.7GB.
# `lane:e2e` 는 빌드본만 켜므로, 0.5GB 를 넘으면 그건 내가 켠 것이 아니다.
#
warn_if_not_our_frontend() {
  local p=$1
  local pid rss_gb
  pid="$(lsof -nP -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  [ -n "$pid" ] || return 0
  rss_gb="$(ps -o rss= -p "$pid" 2>/dev/null | awk '{printf "%.2f", $1/1048576}' || true)"
  [ -n "$rss_gb" ] || return 0
  awk -v r="$rss_gb" 'BEGIN { exit !(r > 0.5) }' || return 0
  printf '\n%s✗%s :%s 의 서버가 빌드본이 아닙니다 (RSS %sGB) — 개발 서버로 보입니다.\n' \
    "$c_red" "$c_off" "$p" "$rss_gb"
  printf '  %slane:e2e 는 `next start`(0.15GB)만 켭니다. 남이 띄운 `next dev` 에 붙은 것입니다.%s\n\n' \
    "$c_dim" "$c_off"
  exit 1
}

# 다른 레인이 예약해 둔 포트인가
port_reserved() {
  [ -d "$LANE_META" ] || return 1
  grep -qs "^\(FRONTEND_PORT\|BACKEND_PORT\)=$1\$" "$LANE_META"/*.env 2>/dev/null
}

# 범위에서 비어 있는 첫 포트
free_port() {
  local p
  for (( p = $1; p <= $2; p++ )); do
    if ! port_busy "$p" && ! port_reserved "$p"; then printf '%s' "$p"; return 0; fi
  done
  return 1
}

# ── prep ────────────────────────────────────────────────────────
cmd_prep() {
  local name=$1 want_fe=$2 want_be=$3 want_iso=${4:-no}
  local wt; wt="$(lane_dir "$name")"
  [ -d "$wt" ] || die "레인이 없습니다: $name  (pnpm lane:new $name 으로 먼저 만드세요)"

  printf '\n%s레인 준비: %s%s\n' "$c_bld" "$name" "$c_off"

  # 1) .env — .gitignore 라 체크아웃으로는 따라오지 않는다.
  #    설치·생성보다 먼저 놓는다 (db:generate 가 DATABASE_URL 을 읽는다)
  local f
  for f in $ENV_FILES; do
    if [ ! -f "$MAIN/$f" ]; then warn "$f 가 메인에 없어 건너뜁니다"; continue; fi
    [ -f "$wt/$f" ] && continue
    mkdir -p "$(dirname "$wt/$f")"
    cp "$MAIN/$f" "$wt/$f"
    ok "$f 복사"
  done

  # 2) 의존성. pnpm 스토어가 따뜻하면 하드링크라 빠르다 (실측 7초).
  #    node_modules 를 통째로 복사해 오는 것보다 오히려 빠르고, pnpm 의
  #    장부(.modules.yaml)가 맞아서 나중에 몰래 설치가 끼어들지 않는다.
  step "pnpm install"
  ( cd "$wt" && pnpm install --prefer-offline ) >/dev/null 2>&1 \
    && ok "의존성 설치" \
    || die "pnpm install 실패 — 레인 안에서 직접 돌려 원인을 보세요: cd $wt && pnpm install"

  # 3) prisma 클라이언트는 워크트리마다 따로다. 없거나 낡으면 새 컬럼이
  #    응답에서 조용히 빠진다 — 검사도 통과한다. 그래서 매번 생성한다 (2초, DB 접속 없음)
  step "prisma 클라이언트 생성"
  ( cd "$wt" && pnpm db:generate ) >/dev/null 2>&1 \
    && ok "prisma 클라이언트" \
    || warn "생성 실패 — 레인 안에서 pnpm db:generate 를 직접 돌려주세요"

  # 4) 포트 배정
  # --isolated 는 「자기 DB · 자기 포트」다 — 프론트·백엔드를 둘 다 자기 것으로 켠다
  [ "$want_iso" = yes ] && { want_fe=yes; want_be=yes; }
  local fe_port="" be_port="" api_port=$SHARED_BACKEND_PORT
  if [ "$want_be" = yes ]; then
    be_port="$(free_port $BACKEND_PORT_RANGE)" || die "백엔드 포트가 남지 않았습니다 ($BACKEND_PORT_RANGE)"
    api_port=$be_port
    # 이 레인 전용 백엔드 — 워크트리의 .env 에만 반영한다
    sed -i '' "s|^PORT=.*|PORT=$be_port|" "$wt/apps/core-backend/.env"
    ok "전용 백엔드 포트 $be_port"
  fi
  if [ "$want_fe" = yes ]; then
    fe_port="$(free_port $FRONTEND_PORT_RANGE)" || die "프론트 포트가 남지 않았습니다 ($FRONTEND_PORT_RANGE)"
    ok "프론트 포트 $fe_port"
    # Origin 은 프록시를 거쳐도 백엔드까지 간다 — 허용 목록에 없으면 로그인부터 막히고,
    # 화면에는 「서버에 연결하지 못했습니다」로만 보여 원인이 드러나지 않는다
    local be_env="$MAIN/apps/core-backend/.env"
    [ "$want_be" = yes ] && be_env="$wt/apps/core-backend/.env"
    if ! grep -q "^ALLOWED_ORIGINS=.*http://localhost:$fe_port\([,]\|$\)" "$be_env"; then
      warn "이 백엔드의 ALLOWED_ORIGINS 에 http://localhost:$fe_port 가 없습니다"
      printf '    %s%s 에 추가하고 백엔드를 다시 띄워야 로그인이 됩니다.%s\n' "$c_ylw" "$be_env" "$c_off"
    fi
  fi

  # 4-b) 격리 레인은 자기 DB 를 갖는다
  local lane_db=""
  if [ "$want_iso" = yes ]; then
    lane_db="$(lane_db_name "$name")"
    clone_lane_db "$lane_db"
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$(shared_db_base)/${lane_db}|" "$wt/apps/core-backend/.env"
    ok "이 레인의 DATABASE_URL 을 ${lane_db} 로"
  fi

  # 5) 이 레인이 볼 백엔드를 한 줄로 못박는다
  if [ -f "$wt/apps/core-frontend/.env.local" ]; then
    sed -i '' "s|^API_URL=.*|API_URL=http://localhost:$api_port|" "$wt/apps/core-frontend/.env.local"
    ok "API_URL → http://localhost:$api_port$([ "$want_be" = yes ] && printf ' (전용)' || printf ' (공유)')"
  fi

  # 6) 레인 장부
  mkdir -p "$LANE_META"
  {
    printf 'LANE=%s\n' "$name"
    printf 'WORKTREE=%s\n' "$wt"
    printf 'API_PORT=%s\n' "$api_port"
    [ -n "$fe_port" ] && printf 'FRONTEND_PORT=%s\n' "$fe_port"
    [ -n "$be_port" ] && printf 'BACKEND_PORT=%s\n' "$be_port"
    [ -n "$lane_db" ] && printf 'LANE_DB=%s\n' "$lane_db"
    printf 'CREATED=%s\n' "$(date '+%Y-%m-%d %H:%M')"
  } > "$(lane_meta "$name")"

  print_lane_banner "$name" "$wt" "$fe_port" "$be_port" "$api_port" "$lane_db"
}

print_lane_banner() {
  local name=$1 wt=$2 fe=$3 be=$4 api=$5 ldb=${6:-}
  printf '\n%s─────────────────────────────────────────────%s\n' "$c_dim" "$c_off"
  printf '%s레인 「%s」 준비 완료%s\n' "$c_bld" "$name" "$c_off"
  printf '  cd %s\n\n' "$wt"

  if [ -n "$ldb" ]; then
    printf '  %s격리 레인입니다 — 자기 DB · 자기 포트.%s\n' "$c_bld" "$c_off"
    printf '  e2e:   pnpm lane:e2e %s [스펙…]   %s켜고 · 재고 · 반드시 내린다%s\n' "$name" "$c_dim" "$c_off"
    printf '         %s빌드본으로 돕니다 (RSS 0.15GB). 서버를 손으로 띄우지 마세요 —%s\n' "$c_dim" "$c_off"
    printf '         %s켜 둔 채 잊으면 그게 RAM 을 먹습니다.%s\n' "$c_dim" "$c_off"
    printf '  검증:  pnpm typecheck && pnpm lint:check && pnpm test:core\n'
    printf '\n  %sDB %s 는 이 레인 것입니다 — pnpm db:seed 를 마음껏 돌리셔도 됩니다.%s\n' \
      "$c_grn" "$ldb" "$c_off"
    printf '  %slane:rm 할 때 이 DB 도 함께 지워집니다.%s\n' "$c_dim" "$c_off"
  elif [ -z "$fe" ] && [ -z "$be" ]; then
    printf '  %s편집 레인입니다 — 서버를 띄우지 않습니다.%s\n' "$c_bld" "$c_off"
    printf '  검증:  pnpm typecheck   pnpm lint:check   pnpm test:core\n'
    printf '  화면:  저장소 루트(런타임 레인)에 브랜치를 체크아웃해서 봅니다\n'
  else
    [ -n "$be" ] && printf '  백엔드:  PORT=%s pnpm dev:core        %s(이 레인 전용)%s\n' "$be" "$c_dim" "$c_off"
    [ -n "$fe" ] && printf '  프론트:  pnpm --filter core-frontend exec next dev -p %s\n' "$fe"
    [ -n "$fe" ] && printf '  e2e:     E2E_NO_WEBSERVER=1 E2E_BASE_URL=http://localhost:%s pnpm --filter core-frontend e2e\n' "$fe"
  fi

  printf '\n  %s백엔드는 :%s 를 봅니다.%s\n' "$c_dim" "$api" "$c_off"
  if [ -n "$ldb" ]; then
    :
  elif [ -z "$be" ]; then
    printf '  %s★ DB·백엔드가 공용입니다 — 전체 시드(pnpm db:seed)를 돌리지 마세요.%s\n' "$c_ylw" "$c_off"
    printf '  %s  옆 레인의 권한이 지워집니다. 스키마를 바꾸려면 lane:prep <이름> --isolated%s\n' "$c_ylw" "$c_off"
    printf '  %s  (--with-backend 는 포트만 가릅니다 — DB 는 공용 그대로입니다)%s\n' "$c_ylw" "$c_off"
  else
    printf '  %s★ 전용 백엔드입니다. migrate diff 의 --shadow-database-url 에%s\n' "$c_ylw" "$c_off"
    printf '  %s  DATABASE_URL 을 주지 마세요 — 공용 개발 DB 가 비워집니다.%s\n' "$c_ylw" "$c_off"
  fi
  printf '%s─────────────────────────────────────────────%s\n\n' "$c_dim" "$c_off"
}

# ── new ─────────────────────────────────────────────────────────
cmd_new() {
  local name=$1 branch=$2 want_fe=$3 want_be=$4 want_iso=${5:-no}
  local wt; wt="$(lane_dir "$name")"
  [ -e "$wt" ] && die "이미 있습니다: $wt"
  [ -n "$branch" ] || branch="work/$name"

  mkdir -p "$WT_BASE"
  if git -C "$MAIN" show-ref --verify --quiet "refs/heads/$branch"; then
    step "기존 브랜치 $branch 로 워크트리 추가"
    git -C "$MAIN" worktree add "$wt" "$branch"
  else
    # ★ 시작점을 반드시 준다. 안 주면 **런타임 레인의 그때 HEAD** 에서 갈라지는데,
    #   그 자리는 lane:show 로 남의 레인을 올려 둔 detached 일 수 있다. 그러면 새 레인이
    #   남의 미착륙 커밋을 깔고 앉은 채 시작하고, 착륙할 때가 되어서야 드러난다.
    #   (실측 2026-09-04: 그렇게 만든 레인이 남의 커밋 7개를 업고 있었다)
    require_integration_branch
    step "새 브랜치 $branch 를 $INTEGRATION_BRANCH 에서 가른다"
    git -C "$MAIN" worktree add -b "$branch" "$wt" "$INTEGRATION_BRANCH"
  fi
  cmd_prep "$name" "$want_fe" "$want_be" "$want_iso"
}

# ── ls ──────────────────────────────────────────────────────────
# 어느 포트가 어느 레인 것인지 못 찾는 일이 없게, 주인 없는 포트도 같이 보여준다
cmd_ls() {
  printf '\n%s%s %s %s %s %s %s%s\n' "$c_bld" \
    "$(pad 레인 14)" "$(pad 브랜치 22)" "$(pad HEAD 9)" "$(pad deps 6)" "$(pad env 6)" "도는 포트" "$c_off"
  printf '%s%s%s\n' "$c_dim" "$(printf '─%.0s' {1..78})" "$c_off"

  local claimed="" line wt br head deps env ports label
  while IFS= read -r line; do
    wt="${line%%|*}"; br="${line#*|}"
    if [ "$wt" = "$MAIN" ]; then label="(런타임)"; else label="${wt##*/}"; fi
    head="$(git -C "$wt" rev-parse --short HEAD 2>/dev/null || printf '?')"
    [ -d "$wt/node_modules" ] && deps="있음" || deps="없음"
    [ -f "$wt/apps/core-backend/.env" ] && env="있음" || env="없음"

    ports=""
    local p pid cwd
    for p in $(seq $SCAN_FRONTEND) $(seq $SCAN_BACKEND); do
      pid="$(lsof -nP -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null | head -1)" || true
      [ -n "$pid" ] || continue
      cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2- || true)"
      [ -n "$cwd" ] || continue
      case "$cwd" in
        "$wt"|"$wt"/*)
          # 메인 루트는 워크트리들의 상위라 하위 레인 것까지 삼킨다 — 걸러낸다
          if [ "$wt" = "$MAIN" ] && case "$cwd" in "$WT_BASE"/*) true;; *) false;; esac; then :
          else ports="$ports $p"; claimed="$claimed $p"; fi ;;
      esac
    done
    [ -n "$ports" ] || ports=" -"

    printf '%s %s %s %s %s %s\n' \
      "$(pad "$label" 14)" "$(pad "$br" 22)" "$(pad "$head" 9)" \
      "$(pad "$deps" 6)" "$(pad "$env" 6)" "${ports# }"
  done < <(git worktree list --porcelain | awk '
      /^worktree /{ w = substr($0, 10) }
      /^branch /  { b = $2; sub(/^refs\/heads\//, "", b); print w "|" b; w=""; b="" }
      /^detached/ { print w "|(detached)"; w="" }')

  # 주인 없는 포트 — 유령 프로세스가 여기 잡힌다
  local orphan="" p pid cwd
  for p in $(seq $SCAN_FRONTEND) $(seq $SCAN_BACKEND); do
    case " $claimed " in *" $p "*) continue;; esac
    pid="$(lsof -nP -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null | head -1)" || true
    [ -n "$pid" ] || continue
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2- || true)"
    orphan="$orphan\n  :$p  pid=$pid  ${cwd:-cwd 를 읽지 못함}"
  done
  if [ -n "$orphan" ]; then
    printf '\n%s레인에 속하지 않은 포트%s' "$c_ylw" "$c_off"
    printf "$orphan\n"
    printf '%s  → 이 저장소 밖이거나, 워크트리가 사라진 뒤 남은 프로세스입니다.%s\n' "$c_dim" "$c_off"
  fi
  printf '\n'
}

# ── rm ──────────────────────────────────────────────────────────
cmd_rm() {
  local name=$1 force=$2
  local wt; wt="$(lane_dir "$name")"
  [ -d "$wt" ] || die "레인이 없습니다: $name"

  local dirty unpushed
  dirty="$(git -C "$wt" status --porcelain)"
  unpushed="$(git -C "$wt" log --oneline '@{u}..HEAD' 2>/dev/null || printf '')"

  if [ -n "$dirty" ] || [ -n "$unpushed" ]; then
    printf '\n%s레인 「%s」 에 잃을 것이 있습니다%s\n' "$c_ylw" "$name" "$c_off"
    [ -n "$dirty" ]    && { printf '\n  커밋 안 된 변경:\n'; printf '%s\n' "$dirty" | sed 's/^/    /'; }
    [ -n "$unpushed" ] && { printf '\n  원격에 없는 커밋:\n'; printf '%s\n' "$unpushed" | sed 's/^/    /'; }
    if [ "$force" != yes ]; then
      printf '\n%s지우지 않았습니다. 확인하신 뒤 --force 를 붙여주세요.%s\n\n' "$c_red" "$c_off"
      exit 1
    fi
    warn "--force — 위 내용을 버리고 지웁니다"
  fi

  # git 은 등록을 먼저 지우고 디렉터리를 나중에 지운다. 그 사이에 안에서 무언가
  # 쓰고 있으면 「Directory not empty」로 **실패하는데 등록은 이미 지워진 뒤**다.
  # 그러면 worktree list 에도 lane:ls 에도 안 보이는 고아 폴더가 남는다.
  local rm_err rc
  rm_err="$(git -C "$MAIN" worktree remove ${force:+--force} "$wt" 2>&1)" && rc=0 || rc=$?
  if [ "$rc" != 0 ]; then
    printf '\n  %sgit 이 한 말:%s\n' "$c_dim" "$c_off" >&2
    printf '%s\n' "$rm_err" | sed 's/^/    /' >&2
    git -C "$MAIN" worktree prune
    if [ -d "$wt" ]; then
      printf '\n'; warn "디렉터리가 남았습니다 — 등록은 지워졌으니 lane:ls 에는 안 보입니다"
      du -sh "$wt" 2>/dev/null | sed 's/^/      /'
      local holders
      holders="$(lsof +D "$wt" 2>/dev/null | awk 'NR>1{print "      " $1 " (pid " $2 ")"}' | sort -u | head -5)"
      if [ -n "$holders" ]; then
        printf '    %s이 안에서 도는 프로세스:%s\n' "$c_ylw" "$c_off"; printf '%s\n' "$holders"
        printf '    %s먼저 내리고 다시 pnpm lane:rm %s 하세요.%s\n' "$c_dim" "$name" "$c_off"
      else
        printf '    %s도는 프로세스는 없습니다. 지우려면:%s  rm -rf %s\n' "$c_dim" "$c_off" "$wt"
      fi
      printf '\n'
    fi
    rm -f "$(lane_meta "$name")"
    exit 1
  fi
  # 격리 레인이면 그 DB 도 함께 지운다. 안 지우면 postgres 에 유령 DB 가 쌓이고,
  # 다음에 같은 이름으로 레인을 만들면 옛 데이터를 그대로 물려받는다.
  local ldb; ldb="$(sed -n 's/^LANE_DB=//p' "$(lane_meta "$name")" 2>/dev/null)"
  [ -n "$ldb" ] && drop_lane_db "$ldb"
  rm -f "$(lane_meta "$name")"
  ok "레인 「${name}」 제거"
}

# ── show / back / land ──────────────────────────────────────────
#
# 런타임 레인은 「보기만 하는 곳」이다. 그런데 사람은 보다가 고친다 —
# detached HEAD 에서 커밋하면 그 커밋은 어떤 브랜치에도 안 붙고, checkout 한 번에
# 화면에서 사라진다 (reflog 에 한동안은 남는다). 이 셋의 값어치는 타자가 아니라
# 그 문을 잡아 주는 데 있다.

SHOW_STATE="$LANE_META/.showing"

# 지금 서 있는 곳이 런타임 레인(메인 워크트리)인가
require_runtime_lane() {
  local here; here="$(git rev-parse --show-toplevel 2>/dev/null || printf '?')"
  [ "$here" = "$MAIN" ] && return 0
  printf '%s✗ 여기는 런타임 레인이 아닙니다%s\n' "$c_red" "$c_off" >&2
  printf '    지금 자리   : %s\n' "$here" >&2
  printf '    런타임 레인 : %s\n' "$MAIN" >&2
  printf '    %s편집 레인에서 이 명령을 쓰면 작업 트리가 남의 커밋으로 갈아엎힙니다.%s\n' \
    "$c_dim" "$c_off" >&2
  exit 1
}

# 보는 동안 만들어진 커밋 목록 (없으면 빈 문자열)
orphan_commits() {
  [ -f "$SHOW_STATE" ] || return 0
  local at; at="$(sed -n 's/^SHOWN_AT=//p' "$SHOW_STATE")"
  [ -n "$at" ] || return 0
  git -C "$MAIN" log --oneline "${at}..HEAD" 2>/dev/null || true
}

# 미아가 될 커밋이 있으면 멈추고 붙일 곳을 알려준다
guard_orphans() {
  local list; list="$(orphan_commits)"
  [ -n "$list" ] || return 0
  local lane; lane="$(sed -n 's/^LANE=//p' "$SHOW_STATE")"
  local br;   br="$(sed -n 's/^SHOWN_BRANCH=//p' "$SHOW_STATE")"
  printf '\n%s보는 동안 만든 커밋이 있습니다 — 이대로 옮기면 미아가 됩니다%s\n\n' "$c_ylw" "$c_off"
  printf '%s\n' "$list" | sed 's/^/    /'
  printf '\n  붙일 곳을 정하세요:\n'
  printf '    %s새 가지로 빼기 %s  git switch -c work/<새이름>\n' "$c_dim" "$c_off"
  printf '    %s레인으로 옮기기%s  cd %s\n' "$c_dim" "$c_off" "$(lane_dir "$lane")"
  printf '                     git cherry-pick %s\n' "$(printf '%s\n' "$list" | awk '{print $1}' | tac | tr '\n' ' ')"
  printf '    %s버리기         %s  pnpm lane:back --force   %s(되돌릴 수 없습니다)%s\n' \
    "$c_dim" "$c_off" "$c_red" "$c_off"
  printf '\n  %s그 레인의 브랜치(%s)에 직접 붙일 수는 없습니다 — 다른 워크트리가 잡고 있어서%s\n' \
    "$c_dim" "$br" "$c_off"
  printf '  %sgit 이 branch -f 를 거절합니다.%s\n\n' "$c_dim" "$c_off"
  exit 1
}

# git 의 checkout 실패를 갈래로 나눈다.
#
# 실패 이유를 하나로 단정하면 안 된다. 도구가 「덮어써질 변경 때문」이라고 말하면
# 사람은 그걸 믿고 멀쩡한 자기 변경을 지우러 간다 — 실제로는 몇 초 기다리면 될
# 일인데. 그래서 git 이 한 말을 먼저 그대로 보여주고, 아는 갈래에만 안내를 얹는다.
#
# 실측(2026-09-03): 워크트리는 각자 인덱스를 쓴다(.git/worktrees/<이름>/index).
# 그래서 레인 안의 커밋은 루트와 안 겹친다 — 겹치는 건 루트 인덱스를 둘이 함께
# 쓸 때뿐이고, 그 락은 몇 초 안에 스스로 풀렸다. 「기다리면 된다」는 근거가 있다.
checkout_or_explain() {
  local target=$1 what=$2 out
  if out="$(git -C "$MAIN" checkout $3 "$target" 2>&1)"; then
    printf '%s\n' "$out"
    return 0
  fi
  printf '\n  %sgit 이 한 말:%s\n' "$c_dim" "$c_off" >&2
  printf '%s\n' "$out" | sed 's/^/    /' >&2
  printf '\n' >&2
  case "$out" in
    *index.lock*)
      die "다른 git 명령이 루트에서 도는 중입니다 — 몇 초 뒤 다시 누르세요 (변경은 그대로 있습니다)" ;;
    *'would be overwritten'*|*'local changes'*)
      die "안 커밋된 변경이 덮어써질 자리라 git 이 막았습니다 — 커밋하거나 되돌린 뒤 다시" ;;
    *'did not match any'*|*'unknown revision'*|*'invalid reference'*)
      die "${what} 「${target}」 를 찾지 못했습니다 — pnpm lane:ls 로 확인하세요" ;;
    *'is already used by worktree'*)
      die "「${target}」 는 다른 워크트리가 잡고 있습니다 — 같은 브랜치는 두 곳에 못 나옵니다" ;;
    *)
      die "체크아웃이 실패했습니다. 원인은 위 git 의 말에 있습니다 (제가 아는 갈래가 아닙니다)" ;;
  esac
}

cmd_show() {
  local name=$1
  require_runtime_lane
  local wt; wt="$(lane_dir "$name")"
  [ -d "$wt" ] || die "레인이 없습니다: ${name}  (pnpm lane:ls 로 확인하세요)"
  local br; br="$(git -C "$wt" rev-parse --abbrev-ref HEAD)"

  # 다른 레인을 보던 중이면, 옮기기 전에 미아부터 챙긴다
  guard_orphans

  # 돌아올 자리. 이미 detached 면 통합 브랜치로 잡는다
  local return_to
  return_to="$(git -C "$MAIN" symbolic-ref -q --short HEAD 2>/dev/null || printf '')"
  if [ -z "$return_to" ]; then
    return_to="$(sed -n 's/^RETURN_TO=//p' "$SHOW_STATE" 2>/dev/null || printf '')"
    [ -n "$return_to" ] || return_to=$INTEGRATION_BRANCH
  fi

  # 안 커밋된 변경은 함께 따라간다. 막지 않고 보여만 준다 —
  # next-env.d.ts 처럼 Next 가 계속 다시 쓰는 추적 파일이 있어서 막으면 매번 걸린다
  local dirty; dirty="$(git -C "$MAIN" status --porcelain)"
  if [ -n "$dirty" ]; then
    warn "안 커밋된 변경이 함께 따라갑니다"
    printf '%s\n' "$dirty" | sed 's/^/      /'
  fi

  checkout_or_explain "$br" "브랜치" --detach

  mkdir -p "$LANE_META"
  {
    printf 'LANE=%s\n' "$name"
    printf 'SHOWN_BRANCH=%s\n' "$br"
    printf 'SHOWN_AT=%s\n' "$(git -C "$MAIN" rev-parse HEAD)"
    printf 'RETURN_TO=%s\n' "$return_to"
  } > "$SHOW_STATE"

  printf '\n%s─────────────────────────────────────────────%s\n' "$c_dim" "$c_off"
  printf '%s레인 「%s」 를 화면에 올렸습니다%s  %s(%s)%s\n' \
    "$c_bld" "$name" "$c_off" "$c_dim" "$(git -C "$MAIN" rev-parse --short HEAD)" "$c_off"

  # 서버가 죽어 있는데 브라우저를 찌르면 옛 화면이나 연결 실패를 진짜로 믿게 된다
  local fe=$RUNTIME_FRONTEND_PORT be=$SHARED_BACKEND_PORT
  if port_busy "$fe"; then printf '  볼 곳:  http://localhost:%s\n' "$fe"
  else warn "프론트(:$fe)가 안 떠 있습니다 — pnpm dev:web"; fi
  port_busy "$be" || warn "백엔드(:$be)가 안 떠 있습니다 — pnpm dev:core"

  printf '\n  %s여기서 고치지 마세요. 돌아갈 때:%s  pnpm lane:back\n' "$c_dim" "$c_off"
  printf '  %s그대로 넣을 때:%s                pnpm lane:land %s\n' "$c_dim" "$c_off" "$name"
  printf '%s─────────────────────────────────────────────%s\n\n' "$c_dim" "$c_off"
}

cmd_back() {
  local force=$1
  require_runtime_lane

  if [ ! -f "$SHOW_STATE" ]; then
    if git -C "$MAIN" symbolic-ref -q HEAD >/dev/null 2>&1; then
      ok "이미 제자리입니다 ($(git -C "$MAIN" rev-parse --abbrev-ref HEAD))"
      return 0
    fi
    warn "장부는 없는데 HEAD 가 떨어져 있습니다 (detached)"
    printf '    손으로 돌아가세요: git checkout %s\n' "$INTEGRATION_BRANCH"
    exit 1
  fi

  [ "$force" = yes ] && { local l; l="$(orphan_commits)"; [ -n "$l" ] && warn "--force — 아래 커밋을 버립니다" && printf '%s\n' "$l" | sed 's/^/      /'; } || guard_orphans

  local return_to; return_to="$(sed -n 's/^RETURN_TO=//p' "$SHOW_STATE")"
  [ -n "$return_to" ] || return_to=$INTEGRATION_BRANCH
  checkout_or_explain "$return_to" "돌아갈 자리" ""
  rm -f "$SHOW_STATE"
  ok "돌아왔습니다 → ${return_to}"
}

# 착륙이 끝난 레인을 치운다. cmd_rm 이 커밋 안 된 변경·안 올린 커밋을 막아 주므로
# 여기서 다시 검사하지 않는다.
finish_lane() {
  local name=$1 br=$2
  cmd_rm "$name" no
  git -C "$MAIN" branch -d "$br" >/dev/null 2>&1 \
    && ok "브랜치 ${br} 제거" \
    || warn "브랜치 ${br} 는 남겨 둡니다 (아직 안 합쳐진 것이 있습니다)"
}

cmd_land() {
  local name=$1 do_rm=$2
  require_runtime_lane
  local wt; wt="$(lane_dir "$name")"
  [ -d "$wt" ] || die "레인이 없습니다: ${name}"
  local br; br="$(git -C "$wt" rev-parse --abbrev-ref HEAD)"

  # 1) 보는 중이면 제자리로 (미아 검사는 cmd_back 이 한다)
  [ -f "$SHOW_STATE" ] && { step "보는 중이라 먼저 제자리로"; cmd_back no; }

  # 2) 레인이 깨끗한가 — 안 커밋된 것은 따라오지 않으므로 조용히 빠진다
  local dirty; dirty="$(git -C "$wt" status --porcelain)"
  if [ -n "$dirty" ]; then
    printf '\n%s레인에 커밋 안 된 변경이 있습니다 — 이대로 넣으면 빠집니다%s\n\n' "$c_ylw" "$c_off"
    printf '%s\n' "$dirty" | sed 's/^/    /'
    printf '\n    cd %s   그리고 커밋하거나 되돌리세요.\n\n' "$wt"
    exit 1
  fi

  local target; target="$(git -C "$MAIN" rev-parse --abbrev-ref HEAD)"

  # 3) 넣을 것이 있는가
  local incoming; incoming="$(git -C "$MAIN" log --oneline "${target}..${br}" 2>/dev/null || printf '')"
  if [ -z "$incoming" ]; then
    ok "${br} 는 이미 ${target} 안에 있습니다 — 넣을 새 커밋이 없습니다"
    # 「넣을 게 없다」와 「정리할 게 없다」는 다른 말이다. --rm 은 착륙이 아니라
    # 뒷정리 요청이고, 이미 들어가 있는 레인이야말로 치울 때다.
    [ "$do_rm" = yes ] && finish_lane "$name" "$br"
    return 0
  fi

  # 4) rebase 가 돼 있는가 — 안 됐으면 fast-forward 가 아니고,
  #    「레인에서 본 트리」와 「들어갈 트리」가 달라진다
  if ! git -C "$MAIN" merge-base --is-ancestor "$target" "$br"; then
    local behind; behind="$(git -C "$MAIN" log --oneline "${br}..${target}" | wc -l | tr -d ' ')"
    printf '\n%s레인이 %s 보다 %s커밋 뒤처져 있습니다 — fast-forward 가 안 됩니다%s\n\n' \
      "$c_ylw" "$target" "$behind" "$c_off"
    printf '  레인에서 바닥을 새로 깔고 다시 검증하세요:\n\n'
    printf '    cd %s\n' "$wt"
    printf '    git rebase %s\n' "$target"
    printf '    pnpm typecheck && pnpm lint:check && pnpm test:core\n\n'
    printf '  %s그래야 확인한 트리가 그대로 들어갑니다.%s\n\n' "$c_dim" "$c_off"
    exit 1
  fi

  printf '\n  들어갈 커밋:\n'; printf '%s\n' "$incoming" | sed 's/^/    /'; printf '\n'
  git -C "$MAIN" merge --ff-only "$br" >/dev/null || die "fast-forward 머지 실패"
  ok "${br} → ${target}  (fast-forward, $(git -C "$MAIN" rev-parse --short HEAD))"

  if [ "$do_rm" = yes ]; then
    finish_lane "$name" "$br"
  else
    printf '  %s레인은 그대로 있습니다. 지우려면: pnpm lane:rm %s%s\n\n' "$c_dim" "$name" "$c_off"
  fi
}

# ── brief ───────────────────────────────────────────────────────
#
# 「지금 이 저장소가 어떤 상태인가」를 한 화면에. 규칙은 CLAUDE.md 가 들고 다니지만
# 살아 있는 상태는 커밋할 수 없어서 파일로는 못 준다 — 루트가 비었는지, 어떤 포트가
# 주인 없는지, 내 레인이 뒤처졌는지. 새 세션이 사람에게 묻는 대신 이걸 돌린다.

cmd_brief() {
  local here br head
  here="$(git rev-parse --show-toplevel 2>/dev/null || printf '?')"
  br="$(git symbolic-ref -q --short HEAD 2>/dev/null || printf 'detached')"
  head="$(git rev-parse --short HEAD 2>/dev/null || printf '?')"
  local is_runtime=no; [ "$here" = "$MAIN" ] && is_runtime=yes

  # 이 레인이 **지금 실제로 가리키는** DB. 장부(`LANE_DB`)가 아니라 `.env` 를 읽는다 —
  # `lane:prep` 가 중간에 넘어지면 장부와 실물이 갈리고, 그때 믿을 것은 실물이다.
  local my_db shared_db is_isolated=no
  my_db="$(sed -n 's/^DATABASE_URL=//p' "$here/apps/core-backend/.env" 2>/dev/null | tr -d '"')"
  my_db="${my_db##*/}"
  shared_db="$(sed -n 's/^DATABASE_URL=//p' "$MAIN/apps/core-backend/.env" 2>/dev/null | tr -d '"')"
  shared_db="${shared_db##*/}"
  [ -n "$my_db" ] && [ -n "$shared_db" ] && [ "$my_db" != "$shared_db" ] && is_isolated=yes

  printf '\n%s━━ 이 저장소는 병렬 레인으로 돌아갑니다 ━━%s\n\n' "$c_bld" "$c_off"

  # ── 지형
  printf '  %s지형%s   편집 레인 ──→ %s ──(PR)──→ main\n' \
    "$c_dim" "$c_off" "$INTEGRATION_BRANCH"
  printf '         %s레인은 %s 로 rebase·착륙합니다. main 은 내보내는 가지라 직접 안 씁니다.%s\n' \
    "$c_dim" "$INTEGRATION_BRANCH" "$c_off"
  printf '         %s⚠ CI 는 지금 main 만 봅니다 — %s 착륙분의 관문은 레인의 검증 3종뿐입니다.%s\n\n' \
    "$c_ylw" "$INTEGRATION_BRANCH" "$c_off"

  # ── 내 자리
  if [ "$is_runtime" = yes ]; then
    printf '  %s내 자리%s  런타임 레인 (저장소 루트)\n' "$c_bld" "$c_off"
    printf '         화면을 띄우는 곳입니다. 여기서 편집하지 마세요.\n'
  else
    printf '  %s내 자리%s  편집 레인  %s%s%s\n' "$c_bld" "$c_off" "$c_dim" "${here##*/}" "$c_off"
    printf '         %s서버를 띄우지 않습니다 — pnpm dev:* 금지, 포트를 열지 마세요.%s\n' "$c_ylw" "$c_off"
    printf '         검증: pnpm typecheck && pnpm lint:check && pnpm test:core\n'
  fi
  printf '         브랜치 %s (%s)\n' "$br" "$head"
  # 🔴 격리인지 공용인지를 **여기서 한 번** 말한다. 아래 「하지 말 것」이 이 값을 따른다.
  # 예전에는 조건 없이 「DB 가 공용입니다」라고만 적어 두어, 격리 레인 사람이 자기 레인을
  # 공용으로 읽었다 (2026-09-11: e2e 25건이 붉은 채, 원인을 그 문장에서 찾고 있었다).
  if [ -n "$my_db" ]; then
    if [ "$is_isolated" = yes ]; then
      printf '         DB  %s  %s← 자기 것입니다 (격리 레인) · db:seed 돌려도 됩니다%s\n' \
        "$my_db" "$c_grn" "$c_off"
    else
      printf '         DB  %s  %s← 공용입니다 — 옆 레인과 함께 씁니다%s\n' \
        "$my_db" "$c_ylw" "$c_off"
    fi
  fi

  # ── 내 레인이 통합 브랜치 대비 어디쯤인가
  if git show-ref --verify -q "refs/heads/$INTEGRATION_BRANCH"; then
    local behind ahead
    behind="$(git rev-list --count "HEAD..$INTEGRATION_BRANCH" 2>/dev/null || printf '?')"
    ahead="$(git rev-list --count "$INTEGRATION_BRANCH..HEAD" 2>/dev/null || printf '?')"
    printf '         %s 대비  뒤 %s · 앞 %s' "$INTEGRATION_BRANCH" "$behind" "$ahead"
    [ "$behind" != 0 ] && [ "$behind" != '?' ] \
      && printf '   %s← 착륙 전에 git rebase %s%s' "$c_ylw" "$INTEGRATION_BRANCH" "$c_off"
    printf '\n'
  fi
  local dirty; dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  [ "$dirty" != 0 ] && printf '         안 커밋된 변경 %s개  %s(next-env.d.ts 는 늘 더럽습니다 — 정상)%s\n' \
    "$dirty" "$c_dim" "$c_off"

  # 이 레인이 보는 DB 가 스키마보다 뒤처져 있는가
  local pend
  pend="$(pending_migrations "$here/apps/core-backend/.env")"
  if [ "$pend" = '?' ]; then
    # 🔴 흐린 글씨였다 — 「못 읽었다」가 「괜찮다」처럼 보이던 자리다.
    # **안 재어진 것과 재어서 0 인 것은 다른 사실**이고, 색이 그 둘을 갈라야 한다.
    printf '         %s⚠ DB 마이그레이션 상태를 못 쟀습니다 (postgres 가 떠 있습니까)%s\n' "$c_ylw" "$c_off"
    printf '         %s  「없다」가 아니라 「모른다」입니다 — 뒤처진 채로 돌 수 있습니다%s\n' "$c_ylw" "$c_off"
  elif [ "$pend" != 0 ]; then
    printf '         %sDB(%s)에 안 올라간 마이그레이션 %s개%s\n' "$c_ylw" "$my_db" "$pend" "$c_off"
    printf '         %s  pnpm prisma migrate deploy --schema apps/core-backend/prisma/schema%s\n' "$c_ylw" "$c_off"
    printf '         %s  그다음 pnpm db:generate — 클라이언트는 워크트리마다 따로입니다%s\n' "$c_dim" "$c_off"
  fi
  printf '\n'

  # ── 런타임 레인이 지금 무엇을 보여주고 있나
  local rt_br rt_head
  rt_br="$(git -C "$MAIN" symbolic-ref -q --short HEAD 2>/dev/null || printf 'detached')"
  rt_head="$(git -C "$MAIN" rev-parse --short HEAD 2>/dev/null || printf '?')"
  printf '  %s런타임%s  %s (%s)' "$c_bld" "$c_off" "$rt_br" "$rt_head"
  if [ -f "$SHOW_STATE" ]; then
    printf '  %s← 「%s」 레인을 보는 중 (누가 쓰고 있습니다)%s' \
      "$c_ylw" "$(sed -n 's/^LANE=//p' "$SHOW_STATE")" "$c_off"
  else
    printf '  %s비어 있음%s' "$c_grn" "$c_off"
  fi
  printf '\n\n'

  # ── 서버
  printf '  %s서버%s   ' "$c_bld" "$c_off"
  local up=""
  port_busy "$RUNTIME_FRONTEND_PORT" && up="$up ${RUNTIME_FRONTEND_PORT}(프론트)"
  port_busy "$SHARED_BACKEND_PORT" && up="$up ${SHARED_BACKEND_PORT}(백엔드)"
  if [ -n "$up" ]; then printf '떠 있음:%s\n' "$up"
  else printf '%s꺼져 있음 — 화면을 보려면 루트에서 pnpm dev:core && pnpm dev:web%s\n' "$c_ylw" "$c_off"; fi

  # 주인 없는 포트. 하루 묵은 고아 백엔드가 공용 백엔드 포트를 잡고 있던 일이 있었다 —
  # 그걸 모르고 화면을 보면 옛 코드를 진짜로 믿게 된다
  local orphans="" p pid cwd
  for p in $(seq $SCAN_FRONTEND) $(seq $SCAN_BACKEND); do
    pid="$(lsof -nP -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null | head -1)" || true
    [ -n "$pid" ] || continue
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2- || true)"
    case "$cwd" in "$MAIN"|"$MAIN"/*) continue;; esac
    orphans="$orphans :$p"
  done
  [ -n "$orphans" ] && printf '         %s이 저장소 밖에서 온 포트:%s — pnpm lane:ls 로 확인%s\n' \
    "$c_ylw" "$orphans" "$c_off"
  printf '\n'

  # ── 원격 CI (gh 가 없거나 느리면 조용히 건너뛴다)
  #
  # ★ --repo 를 반드시 준다. origin 말고 다른 리모트(fork·upstream)가 걸리는 날이
  #   오면, 생략한 gh 는 그쪽을 골라 「남의 CI 결과」를 우리 것인 양 보여준다.
  if command -v gh >/dev/null 2>&1; then
    local slug remote_ci
    slug="$(git -C "$MAIN" remote get-url origin 2>/dev/null \
            | sed -E 's#^git@[^:]+:##; s#^https?://[^/]+/##; s#\.git$##')"
    if [ -n "$slug" ]; then
      remote_ci="$(timeout 10 gh run list --repo "$slug" --workflow CI --limit 3 \
          --json headBranch,conclusion,status --jq \
          '.[] | "\(.headBranch)  \(if .status == "completed" then .conclusion else "진행중" end)"' \
          2>/dev/null || printf '')"
      if [ -n "$remote_ci" ]; then
        printf '  %s원격 CI%s (%s)\n' "$c_bld" "$c_off" "$slug"
        printf '%s\n' "$remote_ci" | sed 's/^/           /' \
          | sed "s/failure/$(printf '%s' "$c_red")failure$(printf '%s' "$c_off")/" \
          | sed "s/success/$(printf '%s' "$c_grn")success$(printf '%s' "$c_off")/"
        printf '\n'
      fi
    fi
  fi

  # ── 다음 수
  printf '  %s다음 수%s\n' "$c_bld" "$c_off"
  if [ "$is_runtime" = yes ]; then
    printf '    pnpm lane:ls              레인·포트 현황\n'
    printf '    pnpm lane:show <이름>     그 레인을 화면에 올린다   /  pnpm lane:back\n'
    printf '    pnpm lane:land <이름>     rebase 됐으면 fast-forward 로 넣는다\n'
  else
    printf '    pnpm typecheck && pnpm lint:check && pnpm test:core   검증 (서버 없이, 파일 안 고침)\n'
    printf '    git rebase %-14s              착륙 전 바닥 깔기\n' "$INTEGRATION_BRANCH"
    printf '    %s화면이 필요하면 루트에서 pnpm lane:show %s — 이 레인에서는 못 돕니다.%s\n' \
      "$c_dim" "${here##*/}" "$c_off"
  fi
  printf '\n'

  # ── 금지
  printf '  %s하지 말 것%s\n' "$c_red" "$c_off"
  # 격리 레인은 자기 DB 라 마음껏 돌려도 된다 (CLAUDE.md 「병렬 레인」). 이 줄을 조건 없이
  # 적어 두었을 때, 격리 레인 사람이 자기 레인을 공용으로 읽었다.
  if [ "$is_isolated" = yes ]; then
    printf '    %s(pnpm db:seed 는 이 레인에서 괜찮습니다 — DB 가 자기 것입니다)%s\n' "$c_dim" "$c_off"
  else
    printf '    pnpm db:seed          DB 가 공용입니다 — 옆 레인 권한이 지워집니다\n'
  fi
  printf '    스키마 동시 변경      바꿀 레인만 pnpm lane:prep <이름> --isolated\n'
  printf '                          %s--with-backend 는 포트만 가릅니다 — DB 는 공용 그대로%s\n' "$c_dim" "$c_off"
  printf '    git push origin main  main 은 내보내는 가지입니다 (PR %s→main 으로만)\n\n' "$INTEGRATION_BRANCH"

  printf '  %s자세한 규칙은 CLAUDE.md 「병렬 레인」 절.%s\n\n' "$c_dim" "$c_off"
}

# ── 격리 (자기 DB · 자기 포트) ───────────────────────────────────
#
# e2e 는 화면 확인과 다른 일이다. 화면은 사람이 한 번에 하나만 보니 순번제가 맞지만,
# e2e 는 기계가 돌리므로 격리하면 여럿이 동시에 돌 수 있다. 지금까지 둘을 같은
# 창구(런타임 포트)로 몰면 레인들이 e2e 를 두고 줄을 선다.
#
# 격리 레인은 자기 DB 와 자기 포트를 갖는다. 그래서
#   · 남의 e2e 가 내 데이터를 밟지 않는다 (공용 DB 라 workers:1 이던 이유가 사라진다)
#   · pnpm db:seed 를 마음껏 돌려도 된다 — 「전체 시드 금지」가 이 레인엔 없다
#
# 서버는 **빌드본**으로 켠다. 실측(2026-09-04, 6화면 훑은 뒤):
#   next dev   RSS 0.79GB · 첫 화면까지 9초 · 오래 쓰면 1.7GB 까지
#   next start RSS 0.15GB · 첫 화면까지 1초 · 빌드 45초
# 켜고 내리는 방식에는 빌드본이 맞다. CI 도 같은 이유로 빌드본을 쓴다 —
# next dev 는 첫 요청마다 컴파일이 붙어 60초 timeout 을 넘기고, 그 실패가
# 「테스트가 틀렸다」로 위장된다 (playwright.config.ts 주석).

# 공용 DB 접속 문자열에서 「서버 부분」만 떼어낸다 (…/weaver2 → …)
shared_db_base() {
  local url; url="$(sed -n 's/^DATABASE_URL=//p' "$MAIN/apps/core-backend/.env" | tr -d '"')"
  printf '%s' "${url%/*}"
}
shared_db_url() { sed -n 's/^DATABASE_URL=//p' "$MAIN/apps/core-backend/.env" | tr -d '"'; }

# 레인 이름 → DB 이름. 한글 이름도 쓰므로 영숫자만 남기고, 남는 게 없으면 해시로.
lane_db_name() {
  local slug; slug="$(printf '%s' "$1" | tr -cd '[:alnum:]' | tr 'A-Z' 'a-z')"
  [ -n "$slug" ] || slug="$(printf '%s' "$1" | shasum | cut -c1-8)"
  printf 'weaver2_%s' "$slug"
}

# 공용 DB 를 통째로 복사한다. TEMPLATE 은 못 쓴다 — 공용에 접속이 붙어 있으면
# 「being accessed by other users」로 거절당한다. dump|restore 는 붙어 있어도 된다.
# 실측: 71테이블·22MB·1.2초.
# 이 레인 DB 에 아직 안 올라간 마이그레이션 개수.
#
# 「스키마는 새것인데 DB 는 옛것」은 증상이 **코드 버그처럼** 보인다 — 새 컬럼이
# 응답에서 조용히 빠지고 typecheck·test 는 통과한다. 그래서 물어보기 전에 말해 준다.
#
# 못 세면 '?' 를 돌려준다. 「0」과 「모름」은 다른 말이고, 여기서 그 둘을 섞으면
# 이 줄이 있으나 마나 해진다 — 조용한 0 은 사람을 안심시키기 때문이다.
pending_migrations() {
  local envf=$1 url dir applied
  url="$(sed -n 's/^DATABASE_URL=//p' "$envf" 2>/dev/null | tr -d '"')"
  [ -n "$url" ] || { printf '?'; return 0; }
  dir="$(dirname "$envf")/prisma/schema/migrations"
  [ -d "$dir" ] || { printf '?'; return 0; }
  applied="$(psql -tA "$url" -c \
    'select migration_name from _prisma_migrations where finished_at is not null' 2>/dev/null)" \
    || { printf '?'; return 0; }
  comm -23 \
    <(find "$dir" -maxdepth 1 -mindepth 1 -type d -exec basename {} \; | sort) \
    <(printf '%s\n' "$applied" | sed '/^$/d' | sort) | wc -l | tr -d ' '
}

clone_lane_db() {
  local db=$1 base; base="$(shared_db_base)"
  step "DB 복제 → ${db}"
  psql -q "${base}/postgres" -c "DROP DATABASE IF EXISTS ${db}" >/dev/null 2>&1
  psql -q "${base}/postgres" -c "CREATE DATABASE ${db}" >/dev/null 2>&1 \
    || die "DB 를 만들지 못했습니다 — postgres 가 떠 있는지, 계정에 createdb 권한이 있는지 보세요"
  pg_dump "$(shared_db_url)" 2>/dev/null | psql -q "${base}/${db}" >/dev/null 2>&1 \
    || die "공용 DB 를 복사하지 못했습니다"
  ok "DB ${db} ($(psql -tA "${base}/${db}" -c "select pg_size_pretty(pg_database_size('${db}'))" 2>/dev/null))"
}

drop_lane_db() {
  local db=$1 base; base="$(shared_db_base)"
  psql -q "${base}/postgres" -c "DROP DATABASE IF EXISTS ${db}" >/dev/null 2>&1 \
    && ok "DB ${db} 제거" || warn "DB ${db} 를 못 지웠습니다 — 붙어 있는 접속이 있는지 보세요"
}

# 백엔드 빌드본이 낡았나. prod:core 는 `node dist/…/main` 이라 빌드가 있어야 돈다 —
# 프론트만 빌드하고 넘어가면 백엔드가 조용히 안 뜨고 e2e 는 로그인부터 실패한다.
backend_is_stale() {
  local wt=$1 out="$1/dist/apps/core-backend/main.js"
  [ -f "$out" ] || return 0
  [ -n "$(find "$wt/apps/core-backend/src" "$wt/libs" -newer "$out" -name '*.ts' \
            -not -path '*/node_modules/*' -print -quit 2>/dev/null)" ]
}

# 빌드본이 지금 소스보다 낡았나
build_is_stale() {
  local wt=$1 id="$1/apps/core-frontend/.next/BUILD_ID"
  [ -f "$id" ] || return 0
  [ -n "$(find "$wt/apps/core-frontend" "$wt/packages" "$wt/libs" \
            -newer "$id" -name '*.ts*' -not -path '*/node_modules/*' -not -path '*/.next/*' \
            -print -quit 2>/dev/null)" ]
}

E2E_FE_PORT=""; E2E_BE_PORT=""; LANE_E2E_NAME=""
cleanup_e2e() {
  # set -e 를 끈다. 뒷정리에는 「이미 없어서 실패하는」 명령이 정상적으로 섞이는데,
  # trap 안에서 그 한 줄이 실패하면 set -e 가 스크립트를 죽이고 **e2e 가 통과했어도
  # 종료코드 1** 이 된다. return 0 으로는 못 막는다 — set -e 가 그 전에 끝낸다.
  set +e
  local p pid sig
  for sig in TERM KILL; do
    for p in "${E2E_FE_PORT:-}" "${E2E_BE_PORT:-}"; do
      [ -n "$p" ] || continue
      pid="$(lsof -nP -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null | head -1)"
      [ -n "$pid" ] && kill "-$sig" "$pid" 2>/dev/null
    done
    sleep 1
  done
  local left=""
  for p in "${E2E_FE_PORT:-}" "${E2E_BE_PORT:-}"; do
    [ -n "$p" ] || continue
    lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && left="$left :$p"
  done
  if [ -n "$left" ]; then
    printf '%s! 아직 살아 있는 포트:%s%s\n' "$c_ylw" "$left" "$c_off" >&2
  else
    printf '%s→%s 서버 내림 (프론트 :%s · 백엔드 :%s)\n' "$c_dim" "$c_off" "${E2E_FE_PORT:-?}" "${E2E_BE_PORT:-?}"
  fi
  return 0   # 뒷정리의 성패가 e2e 의 성패를 덮지 않게
}

cmd_e2e() {
  local name=$1; shift
  local wt; wt="$(lane_dir "$name")"
  [ -d "$wt" ] || die "레인이 없습니다: ${name}"
  local meta; meta="$(lane_meta "$name")"
  [ -f "$meta" ] || die "레인 장부가 없습니다 — pnpm lane:prep ${name} --isolated 로 먼저 격리하세요"

  local fe be db
  fe="$(sed -n 's/^FRONTEND_PORT=//p' "$meta")"
  be="$(sed -n 's/^BACKEND_PORT=//p' "$meta")"
  db="$(sed -n 's/^LANE_DB=//p' "$meta")"
  { [ -n "$fe" ] && [ -n "$be" ] && [ -n "$db" ]; } \
    || die "이 레인은 격리돼 있지 않습니다 — pnpm lane:prep ${name} --isolated"

  # 여유 RAM 을 먼저 본다. 빌드본은 한 벌에 0.2GB 남짓이라 웬만하면 안 걸리지만,
  # 걸릴 땐 「왜 못 켜는지」가 보여야 한다.
  local freepct; freepct="$(memory_pressure 2>/dev/null | sed -n 's/.*free percentage: \([0-9]*\)%.*/\1/p' | tail -1)"
  if [ -n "$freepct" ] && [ "$freepct" -lt 15 ]; then
    warn "메모리 여유가 ${freepct}% 뿐입니다 — 도는 서버부터 정리하세요"
    lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '$9 ~ /:(3[0-9][0-9][0-9]|4[0-9][0-9][0-9])$/ {print "    " $1, $2, $9}' | sort -u
    exit 1
  fi

  # 무슨 일이 있어도 내린다 — 실패해도, Ctrl+C 여도. 사람이 기억할 필요가 없어야 한다.
  #
  # 두 가지를 조심한다.
  #  · trap 은 cmd_e2e 의 local 을 못 본다 — 함수가 끝난 뒤에 돌기 때문이다.
  #    그래서 포트를 **전역**에 둔다 (set -u 라 local 이면 unbound 로 터진다).
  #  · `( … ) &` 의 $! 는 서브셸 pid 라 진짜 서버를 못 잡는다. 그래서 pid 가 아니라
  #    **포트로** 잡는다 — 지금 그 포트를 듣고 있는 놈이 곧 내려야 할 놈이다.
  E2E_FE_PORT="$fe"; E2E_BE_PORT="$be"
  #
  # 🔴 **trap 을 걸기 전에** 포트를 본다. 순서가 뒤집히면 안 된다 —
  # 남의 서버가 있는 채로 trap 이 걸리면, 여기서 멈춰도 뒷정리가 **남의 서버를 내린다.**
  #
  LANE_E2E_NAME="$name"
  require_port_free "$fe" "프론트"
  require_port_free "$be" "백엔드"

  trap cleanup_e2e EXIT INT TERM

  printf '\n%s레인 「%s」 e2e%s  %s프론트 :%s · 백엔드 :%s · DB %s%s\n\n' \
    "$c_bld" "$name" "$c_off" "$c_dim" "$fe" "$be" "$db" "$c_off"

  if build_is_stale "$wt"; then
    step "빌드 (소스가 빌드본보다 새롭습니다 — 45초쯤)"
    ( cd "$wt" && pnpm --filter core-frontend build ) >/dev/null 2>&1 || die "빌드 실패 — 레인에서 pnpm --filter core-frontend build 로 원인을 보세요"
    ok "빌드"
  else
    ok "빌드본이 최신입니다 — 건너뜁니다"
  fi

  if backend_is_stale "$wt"; then
    step "백엔드 빌드"
    ( cd "$wt" && pnpm build:core ) >/dev/null 2>&1 || die "백엔드 빌드 실패 — 레인에서 pnpm build:core 로 원인을 보세요"
    ok "백엔드 빌드"
  else
    ok "백엔드 빌드본이 최신입니다"
  fi

  step "백엔드 :${be}"
  #
  # 🔴 요청 제한(throttle)과 NODE_ENV — **여기가 vands 와 다른 자리다.**
  #
  # 서버는 분당 100회로 막는다 (`core.module.ts:52` ThrottlerModule, ttl 60000 / limit 100).
  # 그 문을 여는 조건은 이 저장소에선 **`NODE_ENV === 'development'` 하나뿐이다**
  # (`common/guards/dev-throttler.guard.ts`). vands 의 `THROTTLE_DISABLED` 같은
  # 스위치는 weaver2 에 **없다** — 그래서 여기서도 주지 않는다.
  #
  # 그래서 NODE_ENV 를 손대지 않는다. 레인의 `.env`(공용에서 복사)가 `development` 라
  # 제한이 열린 채로 돈다. 쿠키도 같은 이유로 안전하다 — secure 강제는 `production`
  # 에서만 걸린다 (`sign-in.controller.ts:38` 외).
  #
  # ⚠ 비대칭이 하나 남는다. CI 는 e2e 를 `NODE_ENV=test` 로 돌리므로(`ci.yml`)
  #   거기서는 제한이 **살아 있다.** 판이 길어지면 CI 에서만 429 가 날 수 있고,
  #   그 실패는 「저장이 조용히 안 된다」로 위장한다 (vands 2026-09-08: 이걸로
  #   반나절. 돌릴 때마다 다른 시험이 죽어 회귀처럼 보였다).
  #   레인이 초록인데 CI 가 붉으면 **먼저 429 를 의심한다.**
  #
  ( cd "$wt" && PORT="$be" pnpm prod:core ) >/dev/null 2>&1 &
  local i=0
  until curl -s -o /dev/null --max-time 2 "http://localhost:${be}/v1/health/ready" 2>/dev/null; do
    i=$((i+1)); [ "$i" -gt 120 ] && die "백엔드가 안 떴습니다 (:${be})"; sleep 1
  done
  ok "백엔드 준비"

  step "프론트 :${fe}"
  ( cd "$wt" && pnpm --filter core-frontend exec next start -p "$fe" ) >/dev/null 2>&1 &
  i=0
  until curl -s -o /dev/null --max-time 2 "http://localhost:${fe}/login" 2>/dev/null; do
    i=$((i+1)); [ "$i" -gt 60 ] && die "프론트가 안 떴습니다 (:${fe})"; sleep 1
  done
  warn_if_not_our_frontend "$fe"
  ok "프론트 준비"

  printf '\n'
  local rc=0
  # playwright 에 넘기는 것은 이 둘뿐이다 — weaver2 의 `playwright.config.ts` 가
  # 읽는 것이 그 둘이기 때문이다 (vands 의 E2E_PORT·E2E_API_PORT 는 여기 없다).
  #   E2E_NO_WEBSERVER : 서버를 직접 안 띄운다. 위에서 이미 켰다.
  #   E2E_BASE_URL     : 이 레인의 프론트를 본다. 안 주면 3000(런타임 레인)을 잰다.
  ( cd "$wt" && E2E_NO_WEBSERVER=1 \
      E2E_BASE_URL="http://localhost:${fe}" \
      pnpm --filter core-frontend exec playwright test "$@" ) || rc=$?

  local peak=""
  local fe_listener; fe_listener="$(lsof -nP -tiTCP:"$fe" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  [ -n "$fe_listener" ] && peak="$(ps -o rss= -p "$fe_listener" 2>/dev/null | awk '{printf "%.2fGB", $1/1048576}' || true)"
  printf '\n  %s프론트 RSS %s%s\n' "$c_dim" "${peak:-?}" "$c_off"
  return $rc
}

# ── 인자 ────────────────────────────────────────────────────────
usage() {
  # 머리말 주석 전체를 그대로 도움말로 쓴다 (행 번호를 박아두면 편집할 때마다 어긋난다)
  sed -n '2,/^set -/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

[ $# -ge 1 ] || usage 1
sub=$1; shift

name=""; branch=""; want_fe=no; want_be=no; force=no; do_rm=no; want_iso=no
rest=()   # 이름 뒤에 남는 것 — lane:e2e 가 playwright 에 그대로 넘긴다
while [ $# -gt 0 ]; do
  case "$1" in
    --branch)        branch="${2:-}"; shift 2 ;;
    --with-frontend) want_fe=yes; shift ;;
    --with-backend)  want_be=yes; shift ;;
    --isolated)      want_iso=yes; shift ;;
    --force|-f)      force=yes; shift ;;
    --rm)            do_rm=yes; shift ;;
    -h|--help)       usage ;;
    # `--` 뒤는 **우리 것이 아니다** — 통째로 playwright 에 넘긴다.
    # 이게 없으면 `rest` 주석의 「그대로 넘긴다」가 스펙 이름에만 해당한다:
    # `--shard=1/4` 같은 플래그는 아래 `-*)` 에 걸려 죽는다 (2026-09-12 에 밟았다).
    --)              shift; while [ $# -gt 0 ]; do rest+=("$1"); shift; done ;;
    -*)              die "모르는 옵션: $1 (playwright 플래그라면 -- 뒤에 두세요)" ;;
    *)               if [ -z "$name" ]; then name="$1"; else rest+=("$1"); fi; shift ;;
  esac
done

case "$sub" in
  new)  [ -n "$name" ] || die "레인 이름이 필요합니다 — pnpm lane:new <이름>"
        cmd_new  "$name" "$branch" "$want_fe" "$want_be" "$want_iso" ;;
  prep) [ -n "$name" ] || die "레인 이름이 필요합니다 — pnpm lane:prep <이름>"
        cmd_prep "$name" "$want_fe" "$want_be" "$want_iso" ;;
  ls|list) cmd_ls ;;
  e2e) [ -n "$name" ] || die "레인 이름이 필요합니다 — pnpm lane:e2e <이름> [스펙…]"
        cmd_e2e "$name" "${rest[@]}" ;;
  brief) cmd_brief ;;
  show) [ -n "$name" ] || die "레인 이름이 필요합니다 — pnpm lane:show <이름>"
        cmd_show "$name" ;;
  back) cmd_back "$force" ;;
  land) [ -n "$name" ] || die "레인 이름이 필요합니다 — pnpm lane:land <이름>"
        cmd_land "$name" "$do_rm" ;;
  rm|remove) [ -n "$name" ] || die "레인 이름이 필요합니다 — pnpm lane:rm <이름>"
        cmd_rm "$name" "$force" ;;
  -h|--help|help) usage ;;
  *) die "모르는 명령: $sub  (brief · new · prep · ls · e2e · show · back · land · rm)" ;;
esac
