# 2. 시작하기 (Getting Started)

이 장의 목표는 하나입니다 — **여러분의 컴퓨터에서 weaver2를 실제로 띄우는 것.** 백엔드 API(`:4000`)와 프론트엔드(`:3000`)가 브라우저에 뜨고, 시드 관리자 계정으로 로그인되는 것까지 가면 성공입니다.

> 💡 weaver2는 `pnpm init` 한 줄로 초기화 대부분을 자동화합니다. 먼저 그 흐름을 따라가고, 막히기 쉬운 곳은 그때그때 짚겠습니다. (실제로 노엘과 팀이 새로 clone해서 겪은 함정들을 그대로 담았어요.)

---

## 2.1 사전 요구사항

| 도구 | 버전 | 확인 |
|------|------|------|
| **Node.js** | `>= 22.0.0` | `node -v` |
| **pnpm** | `>= 11.0.0` | `pnpm -v` (`package.json`이 `pnpm@11.0.8`을 명시 → corepack이 자동 정렬) |
| **PostgreSQL** | `16` 권장 | 아래 2.4에서 Docker로 띄우는 방법 안내 |
| **Git** | 임의 | `git --version` |

> pnpm이 없다면 `corepack enable` 후 저장소에서 아무 pnpm 명령이나 실행하면 명시된 버전(11.0.8)이 자동으로 준비됩니다.

---

## 2.2 한 번에 초기화 — `pnpm init`

저장소를 clone한 뒤, 루트에서:

```bash
pnpm init
```

이 명령은 `scripts/init.sh`를 실행하며, 순서대로 다음을 합니다:

1. **`.env` 파일 생성** — `apps/core-backend/.env`와 `apps/core-frontend/.env.local`을 각 `.env.example`에서 복사
2. **`pnpm install`** — 의존성 설치
3. **`DATABASE_URL` 확인** — 아직 안 채웠으면 **여기서 안내만 하고 멈춥니다** (정상 동작)
4. `prisma generate` → 5. `migrate` → 6. `seed` *(DATABASE_URL이 채워져 있을 때만 진행)*

즉 **첫 실행은 3번에서 멈추는 게 정상**입니다. `.env`를 채운 뒤(2.3) DB를 준비하고(2.4) 다시 `pnpm init`을 돌리면 끝까지 진행됩니다.

> ⚠️ **트러블슈팅 ① — `pnpm install`이 빨간 메시지로 끝나요**
>
> ```
> [ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @nestjs/core, esbuild, sharp, prisma, ...
> Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
> ```
>
> **이건 실패가 아닙니다.** pnpm v11의 보안 정책이 native 빌드 스크립트를 기본 보류한 것뿐이고, 패키지 설치는 정상 완료된 상태입니다. weaver2는 의도적으로 **`sharp`만 빌드를 허용**(`package.json`의 `onlyBuiltDependencies`)하고, Prisma는 별도 `prisma generate`로 처리합니다(2.4). **`pnpm approve-builds`를 함부로 실행하지 마세요** — 빌드 허용 목록이 `package.json`에 추가되어 팀 정책(`sharp`만)이 바뀝니다. 그냥 다음 단계로 진행하면 됩니다.

---

## 2.3 환경 변수 채우기

`pnpm init`이 만들어 준 **`apps/core-backend/.env`**를 엽니다. 처음 띄우는 데 **반드시 채워야 하는 값**은 두 개뿐입니다:

| 변수 | 필수? | 설명 |
|------|:---:|------|
| `DATABASE_URL` | ✅ | `postgresql://weaver:weaver1234@localhost:5432/weaver2` (2.4의 Docker 기본값 기준) |
| `JWT_SECRET` | ✅ | 임의의 긴 문자열. 예: `openssl rand -base64 32` |
| `CSRF_SECRET` | ⬜ | 미설정 시 `JWT_SECRET`을 fallback으로 사용 |
| `SMTP_*` | ⬜ | 이메일 발송(인증메일 등)이 필요할 때. 없으면 메일 기능만 비활성 |
| `GOOGLE/KAKAO/NAVER_*` | ⬜ | 소셜 로그인 쓸 때만 |
| `VAPID_*` | ⬜ | 웹 푸시 쓸 때. `node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"`로 생성 |
| `PERMISSION_CACHE_STRATEGY` | ⬜ | 기본 `memory` (그대로 두면 됨) |

> `.env`에 이미 들어 있는 `DB_USER` / `DB_PASSWORD` / `DB_NAME`(=weaver / weaver1234 / weaver2)은 **Docker로 DB를 띄울 때 그 컨테이너가 읽는 값**입니다. `DATABASE_URL`과 짝을 맞춰 두세요.

**프론트엔드(`apps/core-frontend/.env.local`)**는 보통 손댈 필요 없습니다 (기본값으로 동작):

```env
NEXT_PUBLIC_API_URL=/api        # 브라우저 → Next proxy 경유 same-origin
API_URL=http://localhost:4000   # Next 서버 → 백엔드 (서버사이드 전용)
```

---

## 2.4 데이터베이스 준비

### 옵션 A — Docker (권장, 가장 간단)

저장소에 PostgreSQL 16이 `docker-compose.yml`로 준비돼 있습니다. **DB만** 띄우려면:

```bash
docker compose up -d db
```

`.env`의 `DB_USER/DB_PASSWORD/DB_NAME`을 그대로 두면, `DATABASE_URL`은:

```env
DATABASE_URL=postgresql://weaver:weaver1234@localhost:5432/weaver2
```

### 옵션 B — 로컬 PostgreSQL

이미 PostgreSQL이 깔려 있다면, DB 하나를 만들고 그 접속 정보를 `DATABASE_URL`에 넣으면 됩니다.

### 스키마 생성 + 시드

DB가 떠 있고 `DATABASE_URL`이 채워졌으면, `pnpm init`을 **다시** 실행하면 generate→migrate→seed가 끝까지 갑니다. 또는 수동으로:

```bash
pnpm db:generate   # prisma generate (도메인별 분리 스키마 → 클라이언트)
pnpm db:migrate    # prisma migrate dev (개발용 마이그레이션 적용)
pnpm db:seed       # 권한 그룹·기본 관리자·이메일 템플릿 등 시드
```

> 시드가 만드는 기본 관리자 계정 등은 `apps/core-backend/prisma/seed/`를 참고하세요. (e2e 로그인 시나리오는 `admin@weaver.com` 시드 계정에 의존합니다.)
>
> ℹ️ README에는 `prisma migrate deploy`가 보일 수 있는데, 그건 **프로덕션 배포용**입니다. 로컬 개발에서 스키마를 만들 땐 위의 `pnpm db:migrate`(= `migrate dev`)를 쓰세요.

---

## 2.5 서버 실행

두 앱을 **각각** 띄웁니다 (별도 터미널).

```bash
# 터미널 1 — 백엔드 (port 4000)
pnpm dev
# → nest start --watch. 프로젝트 선택 프롬프트가 나오면 core-backend 선택.

# 터미널 2 — 프론트엔드 (port 3000)
pnpm dev:web
# → gen:slots(슬롯 레지스트리 생성) 후 Next.js dev 서버 기동
```

> `pnpm dev:web`이 먼저 `gen:slots`를 도는 이유는 8장(모듈 레지스트리)에서 설명합니다. 지금은 "프론트는 `dev:web`으로 띄운다"만 기억하면 됩니다.

### 확인

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| API 서버 | http://localhost:4000 |
| Swagger (API 문서) | http://localhost:4000/docs |

시드 관리자 계정으로 로그인까지 되면 환경 구축 성공입니다 (๑•́ ▽ •̀)و

> ⚠️ **트러블슈팅 ② — 첫 커밋이 거부돼요 (`husky pre-commit` 실패)**
>
> 갓 clone한 환경에서 커밋하면 pre-commit 훅이 `pnpm test`를 돌리고, 그 전 단계의 의존성 동기화 체크가 위 2.2의 빌드 보류(`ERR_PNPM_IGNORED_BUILDS`)에 걸려 **exit 1**로 막힐 수 있습니다. weaver2도 이 문제를 알아 **CI에선 `HUSKY=0`으로 우회**합니다(README §CI). 문서/설정만 바꾼 커밋이라면 `git commit --no-verify`로 안전하게 넘기세요. 코드 변경 커밋이라면 테스트를 먼저 직접 돌려(`pnpm test`) 통과를 확인한 뒤 같은 방법을 쓰면 됩니다.

---

## 다음 장

이제 weaver2가 손 안에서 돕니다. 다음은 **요청 하나가 백엔드에서 어떻게 처리되는지**를 실제 코드로 따라갈 차례입니다.

→ **[3장 백엔드 핵심 (Backend Fundamentals)](03-backend-fundamentals.md)**
