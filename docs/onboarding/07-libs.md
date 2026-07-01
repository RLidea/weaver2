# 7. 공유 라이브러리 (libs)

이 장은 `libs/` 아래의 **6개 패키지**를 다룹니다. 이 패키지들은 `apps/core-backend`와 `apps/core-frontend`가 함께 import해서 쓰는 공용 코드입니다. 한 앱에서만 쓰이는 코드는 `libs/`에 올리지 않습니다 — 그 이유는 이 장 끝의 통찰 박스에서 설명합니다.

```
libs/
├── common/        # NestJS 앱 초기화 — 전역 파이프·인터셉터·필터·미들웨어·데코레이터
├── email/         # Nodemailer SMTP 래퍼
├── pagination/    # Offset / Cursor / Keyset 세 가지 페이지네이션 전략
├── prisma/        # PrismaService 모듈 (전역)
├── shared/        # PERMISSIONS 상수 · hasPermission() — 백·프론트 동시 공용 ★
└── upload/        # StorageProvider 인터페이스 + Local / S3 구현
```

모든 패키지는 `tsconfig.json`의 `paths`에 별칭이 등록돼 있습니다.

| 패키지 | import 경로 |
|--------|------------|
| common | `@weaver2/common` |
| email | `@weaver2/email` |
| pagination | `@weaver2/pagination` |
| prisma | `@weaver2/prisma` |
| shared | `@weaver2/shared` |
| upload | `@weaver2/upload` |

---

## 7.1 `common` — NestJS 앱 초기화 도구

### 무엇을 하나

백엔드 앱이 시작될 때 **한 번만 실행되는 전역 설정**을 모아 둔 패키지입니다. `main.ts`에서 `setNestApp(app)` 한 줄로 다음이 한꺼번에 적용됩니다.

| 요소 | 역할 |
|------|------|
| `ValidationPipe` | `class-validator` 검증 실패 → `422 UnprocessableEntity` + `VALIDATION_ERROR` 코드 |
| `SuccessInterceptor` | 모든 성공 응답을 `{ data, meta }` 봉투로 감쌈 |
| `ClassSerializerInterceptor` | `@Exclude()` / `@Expose()` 직렬화 지원 |
| `HttpExceptionFilter` | NestJS `HttpException`을 표준 에러 구조로 변환 |
| `PrismaClientExceptionFilter` | Prisma 예외(`P2002` 등)를 HTTP 에러로 매핑 |
| 미들웨어 | URI 버저닝 활성화 · cookie-parser · Helmet · CORS |
| Swagger | 비 프로덕션 환경에서 `/docs` 자동 마운트 |

### 어떻게 import해서 쓰나

```typescript
// apps/core-backend/src/main.ts
import { setNestApp } from '@weaver2/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setNestApp(app);                // 전역 파이프·인터셉터·필터·미들웨어 일괄 적용
  await app.listen(4000);
}
```

데코레이터는 컨트롤러와 서비스 안에서 직접 import합니다.

```typescript
import { Public, AuthUser, ApiStandardResponses } from '@weaver2/common';

@Controller('posts')
export class PostController {
  @Public()                         // 인증 없이 접근 허용 (secure-by-default의 예외 선언)
  @Get()
  @ApiStandardResponses()          // Swagger에 표준 응답 코드 자동 등록
  findAll() { ... }

  @Get('me')
  getMyPosts(@AuthUser() user: CommonAuthUserDto) { ... }
}
```

주요 export 목록:

```
setNestApp()               — 앱 전체 초기화 진입점
@Public()                  — IS_PUBLIC_KEY 메타데이터 설정 (AuthGuard 화이트리스트)
@AuthUser()                — 요청에서 JWT 페이로드를 꺼내 주는 파라미터 데코레이터
@CallbackUser()            — OAuth 콜백 요청의 사용자 정보 추출
@ApiStandardResponses()    — Swagger 공통 응답 코드 일괄 등록
BaseResponseDto            — 성공/에러 응답 기본 타입
CommonAuthUserDto          — AuthUser 데코레이터가 돌려주는 DTO
generateToken()            — 랜덤 토큰 생성 유틸리티
RESERVED_NAMES             — 예약어 상수 (username 중복 방지 등)
```

### 무엇을 의존하나

- NestJS(`@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`)
- `class-validator` · `class-transformer`
- `helmet` · `cookie-parser`

> **3장과의 연결**: `common`이 세팅하는 `ValidationPipe`·`SuccessInterceptor`·`ExceptionFilter`가 백엔드 요청 생애 전체를 감쌉니다. 3장에서 추적한 `Controller → Service → Repository` 흐름의 입구와 출구가 바로 이 패키지입니다.

---

## 7.2 `email` — Nodemailer SMTP 래퍼

### 무엇을 하나

`SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS` 환경변수를 읽어 **Nodemailer transporter를 초기화**하고, `sendMail()` 하나로 메일을 발송하는 얇은 래퍼입니다. 비즈니스 로직(이메일 템플릿 DB 조회, 발송 로그 기록 등)은 **이 패키지에 없습니다** — 그건 `apps/core-backend/src/infrastructure/email/`이 담당합니다.

### 어떻게 import해서 쓰나

```typescript
// apps/core-backend의 infrastructure 모듈에서
import { EmailModule, EmailService, SendEmailOptions } from '@weaver2/email';

@Module({
  imports: [EmailModule],   // EmailService를 DI 컨테이너에 등록
})
export class InfraEmailModule {}
```

```typescript
import { EmailService } from '@weaver2/email';

const options: SendEmailOptions = {
  to: 'user@example.com',
  subject: '인증 코드',
  html: '<p>코드: 123456</p>',
};
await this.emailService.sendMail(options);
```

주요 export:

```
EmailModule       — NestJS 모듈 (EmailService 제공)
EmailService      — sendMail(options) 단일 메서드
SendEmailOptions  — { to, subject, html, from? } DTO
EmailResult       — 발송 결과 인터페이스
```

### 무엇을 의존하나

- `nodemailer`
- `@nestjs/config` (환경변수 주입)

> ⚠️ `SMTP_*` 환경변수 4개 중 하나라도 누락되면 모듈 초기화 시점에 예외가 발생합니다. 메일 기능이 필요 없는 환경에서는 `EmailModule`을 import하지 않으면 됩니다.

---

## 7.3 `pagination` — 세 가지 페이지네이션 전략

### 무엇을 하나

**Offset · Cursor · Keyset** 세 가지 페이지네이션을 제공합니다. 일반 목록 API에는 **Keyset이 주력**입니다(4장 참고).

| 전략 | 언제 쓰나 | 핵심 특징 |
|------|-----------|-----------|
| **Keyset** | 주력 — 게시글·댓글 목록 | `WHERE` 조건 직접 생성, DB 재조회 없음, 페이지 스킵 불가 대신 빠름 |
| Cursor | Base64 커서 기반 순회 | offset보다 일관성 좋음, Keyset보다 유연성 낮음 |
| Offset | 관리자 페이지 등 페이지 이동이 필요한 곳 | 직관적이지만 대용량에서 느림 |

### 어떻게 import해서 쓰나

```typescript
import {
  KeysetPaginationService,
  KeysetRequestDto,
  KeysetResponseDto,
} from '@weaver2/pagination';
```

**Keyset 사용 예 — 게시글 목록**

```typescript
// 컨트롤러
@Get()
async findAll(@Query() query: KeysetRequestDto) {
  return this.postService.findAll(query);
}

// 서비스
async findAll(query: KeysetRequestDto): Promise<KeysetResponseDto<Post>> {
  return KeysetPaginationService.paginate({
    prisma: this.prisma.post,
    preset: query.preset ?? 'created-at',  // 'created-at' | 'view-count'
    cursor: query.cursor,
    limit: query.limit,
    where: { boardId: query.boardId },
  });
}
```

내장 프리셋:

| 프리셋 이름 | 정렬 기준 | tiebreaker |
|-------------|-----------|------------|
| `created-at` (기본값) | `createdAt DESC` | `id ASC` |
| `view-count` | `viewCount DESC` | `id ASC` |

커스텀 프리셋이 필요하면 `KEYSET_PRESETS`에 항목을 추가합니다. 마지막 필드는 반드시 **unique한 tiebreaker**(보통 `id`)이어야 합니다.

응답 구조:

```typescript
interface KeysetResponseDto<T> {
  data: T[];
  nextCursor: string | null;   // null이면 마지막 페이지
  hasNextPage: boolean;
}
```

주요 export:

```
KeysetPaginationService   — static paginate() 메서드
KeysetRequestDto          — { preset?, cursor?, limit? }
KeysetResponseDto<T>      — { data, nextCursor, hasNextPage }
KeysetPreset / KeysetFieldDef  — 커스텀 프리셋 타입
KEYSET_PRESETS            — 내장 프리셋 레지스트리
OffsetPaginationService   — 전통적 offset 방식
CursorPaginationService   — Base64 커서 방식
```

### 무엇을 의존하나

- 프레임워크 의존성 없음 (순수 TS + Prisma 쿼리 인터페이스)
- Prisma 모델의 `findMany` 시그니처를 그대로 받음

> **4장과의 연결**: 4장에서 다룬 게시판 목록 API는 Keyset을 기본으로 씁니다. `preset: 'created-at'`이 기본값이므로 대부분의 목록은 파라미터 없이도 동작합니다.

---

## 7.4 `prisma` — PrismaService 모듈

### 무엇을 하나

`PrismaClient`를 확장한 **`PrismaService`**를 NestJS DI 컨테이너에 전역으로 등록합니다. `@Global()` 데코레이터가 붙어 있으므로 **`PrismaModule`을 한 번만 import하면** 이후 모든 모듈에서 `PrismaService`를 주입받을 수 있습니다.

### 어떻게 import해서 쓰나

```typescript
// AppModule — 한 번만 등록
import { PrismaModule } from '@weaver2/prisma';

@Module({
  imports: [PrismaModule, ...],
})
export class AppModule {}
```

```typescript
// 개별 Repository
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class PostQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.post.findUnique({ where: { id } });
  }
}
```

주요 export:

```
PrismaModule    — @Global() 모듈, PrismaService를 전역 제공·export
PrismaService   — PrismaClient 확장체 (OnModuleInit/OnModuleDestroy 처리 포함)
```

### 무엇을 의존하나

- `@prisma/client` (생성된 Prisma 클라이언트)
- `@nestjs/common`

> `PrismaService`는 옵션으로 `explicitConnect: true`를 받을 수 있습니다. 기본값(`false`)에서는 첫 쿼리 시점에 lazy connect가 발생합니다.

---

## 7.5 `shared` — 권한 상수 (백·프론트 공용) ★

### 무엇을 하나

**이 패키지가 `libs/` 중 가장 중요합니다.** 백엔드와 프론트엔드 양쪽이 "권한이 있는가?"를 판단해야 하는데, 그 기준(`PERMISSIONS` 상수)이 양쪽에 따로 있으면 언제든 어긋납니다. `shared`는 이 진실의 원천을 **단 한 곳**에 두기 위해 존재합니다.

NestJS·React 등 **프레임워크 의존성이 전혀 없는 순수 TypeScript**로만 작성되어 있어, 백엔드와 프론트엔드 모두에서 그대로 import됩니다.

### 어떻게 import해서 쓰나

**백엔드 — 가드에서 권한 확인**

```typescript
import { PERMISSIONS } from '@weaver2/shared';

// @RequirePermission('post:create') 같은 커스텀 데코레이터와 함께 사용
@RequirePermission(PERMISSIONS.POST.CREATE)
@Post()
createPost() { ... }
```

**프론트엔드 — UI 조건부 렌더링**

```typescript
import { PERMISSIONS, hasPermission } from '@weaver2/shared';

function PostActions({ userPermissions }: { userPermissions: string[] }) {
  const canDelete = hasPermission(userPermissions, PERMISSIONS.POST.DELETE_OWN);
  return canDelete ? <DeleteButton /> : null;
}
```

**`PERMISSIONS` 구조 — 리소스별 네임스페이스**

```typescript
PERMISSIONS.POST.CREATE       // 'post:create'
PERMISSIONS.POST.UPDATE_ALL   // 'post:update:all'
PERMISSIONS.POST.ALL          // 'post:*'   ← 와일드카드
PERMISSIONS.ADMIN.ACCESS      // 'admin:access'
PERMISSIONS.SUPER             // '*:*'      ← 슈퍼관리자
```

전체 리소스: `POST` · `COMMENT` · `BOARD` · `BANNER` · `USER` · `ADMIN` · `EMAIL` · `ANALYTICS` · `TERMS` · `PERMISSION_GROUP` · `UPLOAD` · `ABUSE_REPORT` · `MODERATION`

**`hasPermission(userPermissions, required)` — 와일드카드 지원**

```typescript
hasPermission(['post:*'], 'post:delete:own')   // true  (리소스 와일드카드)
hasPermission(['*:*'],    'admin:access')       // true  (슈퍼관리자)
hasPermission(['post:read'], 'post:create')    // false
```

주요 export:

```
PERMISSIONS       — 리소스별 권한 문자열 상수 객체 (as const)
Permission        — 모든 권한 문자열의 유니온 타입
hasPermission()   — (userPermissions: string[], required: string) => boolean
```

### 무엇을 의존하나

- **외부 의존성 없음** — 순수 TypeScript 상수 + 함수

> **5장과의 연결**: 5장의 `AuthGuard`와 `PermissionGuard`는 이 패키지의 `PERMISSIONS`와 `hasPermission()`을 토대로 동작합니다. 새 기능에 권한을 추가할 때는 `libs/shared/src/index.ts`의 `PERMISSIONS`부터 정의한 뒤, 백엔드 Guard와 프론트엔드 조건부 렌더링 양쪽에서 그것을 참조합니다.

---

## 7.6 `upload` — 파일 저장 추상화

### 무엇을 하나

파일 저장의 구체적인 위치(로컬 디스크 vs S3)를 **`STORAGE_DRIVER` 환경변수 하나로 전환**할 수 있도록 추상화합니다. `StorageProvider` 인터페이스를 정의하고, 그 구현체(`LocalStorageProvider` / `S3StorageProvider`)를 NestJS 팩토리 프로바이더로 교체합니다.

```
STORAGE_DRIVER=local   → LocalStorageProvider (디스크 저장, 기본값)
STORAGE_DRIVER=s3      → S3StorageProvider    (AWS S3 / MinIO)
```

### 어떻게 import해서 쓰나

```typescript
// 앱 모듈에 UploadModule import
import { UploadModule } from '@weaver2/upload';

@Module({ imports: [UploadModule] })
export class AppModule {}
```

```typescript
// 컨트롤러에서 UploadService 주입
import { UploadService } from '@weaver2/upload';

@Post('files')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File) {
  return this.uploadService.uploadFile(file, 'posts');
}
```

`StorageProvider` 인터페이스 (토큰: `STORAGE_PROVIDER`):

```typescript
interface StorageProvider {
  save(file: Express.Multer.File, directory: string)
    : Promise<{ storedName: string; path: string }>;
  saveBuffer(buffer: Buffer, filename: string, directory: string)
    : Promise<{ storedName: string; path: string }>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getFileUrl(path: string): Promise<string>;
}
```

커스텀 저장소를 추가하려면 이 인터페이스를 구현하고 `UploadModule`의 팩토리 프로바이더에 분기를 추가합니다.

주요 export:

```
UploadModule              — StorageProvider + UploadService 등록·제공
UploadService             — 파일 업로드·삭제·조회 비즈니스 로직
ThumbnailService          — 이미지 썸네일 생성 (sharp)
StorageProvider           — 저장소 인터페이스 (토큰: STORAGE_PROVIDER)
LocalStorageProvider      — 로컬 디스크 구현
S3StorageProvider         — AWS S3 / MinIO 구현
CreateFileCommand         — DB 파일 레코드 생성
FindFileByIdQuery         — DB 파일 레코드 조회
DeleteFileCommand         — DB 파일 레코드 삭제
UpdateFileCommand         — DB 파일 레코드 갱신
FileDto / UploadFileDto   — 요청·응답 DTO
```

### 무엇을 의존하나

- `@weaver2/prisma` (파일 메타데이터 DB 저장)
- `@nestjs/config`
- `multer` (파일 수신)
- `sharp` (썸네일 생성)
- `@aws-sdk/client-s3` (S3 드라이버 사용 시)

---

## 🔍 통찰 — `libs/`에 올라가는 코드의 기준

`libs/`에는 무엇이 올라가고 무엇이 올라가지 않을까요?

> **`libs/`는 "여러 곳이 동시에 필요로 할 때 끌려오는 곳"이지, "미래를 위해 미리 올려 두는 곳"이 아닙니다.**

`CHARTER.md §5.1`은 이 경계를 **"pull, not push"** 원칙으로 표현합니다. 추상화는 두 번째·세 번째 실제 사용 사례가 *끌어당길 때* 승격되어야 하고(Rule of Three), 아직 없는 수요를 상상해서 *밀어 넣으면* 과도한 일반화입니다.

현재 `libs/` 6개를 이 기준으로 읽으면 명확해집니다.

| 패키지 | `libs/`에 있는 이유 |
|--------|---------------------|
| `shared` | 백엔드·프론트엔드 **양쪽**이 동일한 권한 상수를 알아야 함 |
| `prisma` | 백엔드의 **모든 feature·core**가 DB에 접근해야 함 |
| `common` | NestJS 앱 초기화 설정이 **앱 전체**에 한 번 적용되어야 함 |
| `pagination` | 게시글·댓글·사용자 등 **여러 feature**가 동일한 방식으로 목록을 내려야 함 |
| `email` | 인증·알림·관리자 등 **여러 feature**가 메일을 발송해야 함 |
| `upload` | 게시글 첨부·프로필 사진 등 **여러 feature**가 파일을 저장해야 함 |

반대로, 게시판(`board`)의 댓글 조회 로직은 `board` feature만 쓰므로 `apps/core-backend/src/features/board/` 안에 있고 `libs/`로 올라오지 않습니다. 특정 feature를 다른 프로젝트에서도 쓴다는 것이 *실제로* 확인되면 그때 승격을 논의합니다.

이 원칙을 기억해 두면, 새 코드를 작성할 때 "이걸 `libs/`에 넣어야 하나?"라는 질문의 답이 쉬워집니다 — **지금 두 곳 이상에서 동시에 필요하지 않다면, 아직 아닙니다.**

---

→ **[8장 모듈 레지스트리 (Module Registry)](08-module-registry.md)**
