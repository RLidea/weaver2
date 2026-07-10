# 01. 백엔드 아키텍처

> NestJS 앱이 어떻게 조직되어 있는지 — 모듈 4분류, Controller→Service→Repository 계층, `libs/` 6종의 역할, 그리고 모든 API가 공유하는 응답·에러 포맷.

## 1. 부트스트랩 구조

루트 모듈은 관례상 `AppModule`이 아니라 **`CoreModule`**(`apps/core-backend/src/core.module.ts`)입니다. `main.ts`는 의도적으로 얇습니다:

1. `NestFactory.create(CoreModule, { logger: WinstonModule.createLogger(...) })` — 시작부터 Winston 로거로 교체
2. URI 버저닝 활성화 (`/v1/...`)
3. 정적 서빙 2곳 — `uploads/` → `/uploads`, `src/assets` → `/`
4. **`setNestApp(app)`** — 전역 파이프라인 전체를 여기서 조립 ([`libs/common/src/global/nest.config.ts`](../../libs/common/src/global/nest.config.ts)): 미들웨어 → 인터셉터 → 파이프 → 예외 필터 → shutdown hooks → Swagger(비프로덕션 한정)
5. 포트 `PORT` env (기본 4000)

전역 파이프라인이 `libs/common`에 있는 이유: 이 보일러플레이트에서 앱이 늘어나도 같은 파이프라인을 공유하기 위한 자리입니다.

`CoreModule`이 전역으로 켜는 것들: `ConfigModule`(isGlobal), `JwtModule`(global, `JWT_SECRET`), `ThrottlerModule`(60초/100회), `EventEmitterModule`, `ScheduleModule`.

## 2. 모듈 4분류

`apps/core-backend/src/`의 최상위 분류가 곧 아키텍처입니다 (CHARTER의 substrate/예시 구분과 일치):

| 분류 | 모듈 | 성격 |
|---|---|---|
| `core/` | auth, user, notification, permission, terms | **substrate** — 어떤 도메인에도 필요한 공통 기반. 새 프로젝트에서 그대로 재사용 |
| `features/` | board, report, search | **레퍼런스 도메인** — 커뮤니티 예시. 새 도메인은 이 자리에 추가하거나 갈아끼움 |
| `infrastructure/` | email, upload, analytics, config(SystemSetting) | 외부 시스템 연동·런타임 설정 |
| `system/` | admin, health, static | 운영 — 관리자 API 집결지, 헬스체크(`/health`, `/health/ready`, `/health/live`) |

각 도메인 모듈의 내부 표준 구조:

```
features/board/
├── controllers/     # HTTP 계층 — 라우팅, 데코레이터(@Public, @RequirePermission), DTO 바인딩
├── services/        # 비즈니스 로직 — 도메인 규칙, 예외 던지기, 트랜잭션 조율
├── repositories/    # DB 접근 — *.query.ts(읽기) / *.command.ts(쓰기)
├── dto/             # 요청/응답 DTO (class-validator)
└── board.module.ts
```

## 3. 레포지토리 패턴 — CQRS 파일 분리

**`@nestjs/cqrs` 프레임워크를 쓰지 않습니다.** "CQRS"는 레포지토리를 읽기/쓰기 **파일로 분리하는 자체 관례**입니다 (CHARTER §5: "읽기/쓰기 책임을 파일 레벨에서 시각화").

레포지토리는 클래스·프로바이더가 아니라 **`PrismaClient`를 첫 인자로 받는 순수 async 함수**입니다:

```ts
// features/board/repositories/find-board-by-id.query.ts (읽기)
export async function FindBoardByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.board.findUnique({ where: { id, deletedAt: null } });
}

// features/board/repositories/create-board.command.ts (쓰기)
export async function CreateBoardCommand(prisma: PrismaClient, name: string, description?: string) {
  return prisma.board.create({ data: { name, description } });
}
```

서비스가 이 함수들을 import해서 자신의 `PrismaService`를 넘겨 호출합니다:

```ts
// features/board/services/board.service.ts
const existing = await FindBoardByNameQuery(this.prisma, name);
if (existing) throw new ConflictException(...);
return CreateBoardCommand(this.prisma, name, description);
```

이 패턴의 함의:

- **DI 등록 불필요** — 레포지토리 함수는 모듈 providers에 넣지 않습니다. 새 쿼리 = 새 파일 하나
- **읽기 쿼리는 `deletedAt: null` 필터가 관례** — soft-delete를 존중하는 책임이 레포지토리에 있음
- **트랜잭션이 필요하면** 서비스에서 `prisma.$transaction`으로 조율하고, 함수에는 트랜잭션 클라이언트를 그대로 넘길 수 있음 (첫 인자가 `PrismaClient` 호환이므로)
- 테스트에서는 서비스의 `prisma`를 모킹하면 레포지토리 함수까지 함께 검증됨 → [09장](09-testing.md)

## 4. `libs/` 6종

모두 `tsconfig.json` paths의 **`@weaver2/*`** alias로 import합니다.

| lib | 역할 | 자주 쓰는 export |
|---|---|---|
| `@weaver2/shared` | ★ **백·프론트 공용** 순수 TS. 프레임워크 의존성 없음 | `PERMISSIONS` 상수, `hasPermission()` → [04장](04-permissions.md) |
| `@weaver2/common` | 백엔드 전역 파이프라인의 실체 + 공용 데코레이터 | `@Public()`, `@AuthUser()`, `@ApiStandardResponses()`, `setNestApp`, `winstonLoggerConfig` |
| `@weaver2/prisma` | `@Global()` 모듈. `PrismaService`(= `PrismaClient` 상속 + 수명주기 훅) | `PrismaService` |
| `@weaver2/pagination` | keyset / cursor / offset 3전략 | `KeysetPaginationService`, keyset builder/presets → [07장](07-board-reference.md) |
| `@weaver2/upload` | 파일 업로드 모듈 — StorageProvider 추상화 | `UploadService`, `ThumbnailService` → [06장](06-uploads.md) |
| `@weaver2/email` | Nodemailer 래퍼 모듈 | `EmailService` |

주의할 중복 두 가지 (헷갈리기 쉬움):

- **이메일이 두 곳** — `libs/email`은 SMTP 전송 래퍼, `apps/core-backend/src/infrastructure/email`은 DB 템플릿·발송 로그·재발송까지 담당하는 도메인 모듈. CoreModule이 import하는 것은 후자입니다.
- **PERMISSIONS의 진짜 정의는 `libs/shared`** — `libs/common/src/constants/permissions.const.ts`는 re-export + 관리자 UI용 라벨 목록(`ALL_PERMISSIONS`)만 추가한 것입니다.

## 5. 전역 응답·에러 포맷

모든 API가 아래 포맷을 따릅니다. 클라이언트(ApiClient)도 이 형태를 전제로 작성되어 있습니다.

**성공** — `SuccessInterceptor`(`libs/common/src/global/interceptor/success-response.interceptor.ts`)가 래핑:

```jsonc
{ "message": "success", "data": { ... } }
// 핸들러가 { message: "...", ...rest }를 반환하면 message는 그 값, 나머지가 data로
```

**에러** — 두 필터가 처리 (`libs/common/src/global/exception-filter/`):

```jsonc
// HttpExceptionFilter — 모든 예외
{ "success": false,
  "error": { "code": 404, "message": "...", "timestamp": "ISO8601", "path": "/v1/..." } }

// ValidationPipe 실패 (422)
{ "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": ["필드별 메시지", "..."], ... } }

// PrismaClientExceptionFilter — P2002(unique 충돌)→409, P2025(레코드 없음)→404
{ "success": false, "error": { "code": 409, "message": "Duplicate field: ...", "timestamp": "..." } }
```

특이 동작 하나: 401/403 응답인데 요청의 `Accept`가 `text/html`이면 JSON 대신 `/admin/login`으로 redirect합니다 — 관리자 화면에서 세션이 끊겼을 때의 UX 처리입니다 (`http-exception.filter.ts`).

## 6. 로깅

- 설정: [`libs/common/src/global/logger/winston.config.ts`](../../libs/common/src/global/logger/winston.config.ts)
- **개발**: `debug` 레벨, 컬러 콘솔(nestLike 포맷)
- **프로덕션**: `info` 레벨, JSON 콘솔 + 일별 로테이트 파일 `logs/app-%DATE%.log`(14일 보관) + `logs/error-%DATE%.log`(error만, 30일)
- 서비스 코드에서는 NestJS `Logger`를 사용합니다 (`console.*`는 시드 CLI 등 의도된 예외만 — CHARTER §8)

## 더 보기

- 요청이 이 구조를 통과하는 순서: [00. 시스템 개요 §2](00-overview.md#2-백엔드-요청-수명주기)
- 데이터 계층: [02. 데이터 모델](02-data-model.md)
- NestJS 일반 규칙: [`.agents/skills/nestjs-best-practices/`](../../.agents/skills/nestjs-best-practices/)
- 코딩 표준(ApiClient·네이밍): [`.agents/skills/weaver-coding-standards/`](../../.agents/skills/weaver-coding-standards/)
