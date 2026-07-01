# 3. 백엔드 핵심 (Backend Fundamentals)

이 장의 목표는 두 가지입니다 — weaver2 백엔드 코드가 **어떤 원칙으로 나뉘어 있는지** 먼저 파악하고, 그다음 **실제 요청 하나가 코드를 어떻게 통과하는지** 직접 따라가는 것입니다. 1장에서 소개한 네 계층과 `Controller → Service → Repository` 흐름을 이제 실제 파일 경로와 코드로 뜯어봅니다.

> 📌 **순수 NestJS 문법**(`@Module`, `@Controller`, `@Injectable` 등)은 [NestJS 공식 문서](https://docs.nestjs.com)가 가장 정확하게 다룹니다. 이 장은 "weaver2가 NestJS를 *어떻게* 쓰는지" — 즉 weaver2만의 계층 규칙, Repository 함수형 패턴, 전역 파이프라인 — 에만 집중합니다.

---

## 3.1 백엔드 4계층 — 코드가 사는 동네

백엔드 소스는 `apps/core-backend/src/` 아래 성격별로 네 디렉토리로 분류됩니다.

```
apps/core-backend/src/
├── core/           # 플랫폼 기반 (auth, user, permission, notification, terms)
├── features/       # 비즈니스 기능 (board, banner, search, abuse-report)
├── infrastructure/ # 외부 연동 (email, upload, analytics, config)
└── system/         # 운영·시스템 API (admin, health, static)
```

### 계층별 역할과 경계

| 계층 | 역할 | 현재 포함된 기능 | 특징 |
|------|------|----------------|------|
| `core/` | 모든 기능이 의존하는 **플랫폼 토대** | auth, user, permission, notification, terms | 함부로 건드리지 않는다 |
| `features/` | **비즈니스 기능** — 프로젝트마다 다를 수 있음 | board, banner, search, abuse-report | 새 기능이 태어나는 곳 |
| `infrastructure/` | **외부 서비스·인프라 연동** | email(SMTP), upload(Local/S3), analytics, config | 드라이버 교체 지점 |
| `system/` | **운영자 전용** API 및 시스템 엔드포인트 | admin, health, static | 일반 사용자 접근 없음 |

> 🔍 **"새 기능은 어느 계층?"** 의 답 흐름
>
> 1. **모든 서비스에서 공통으로 쓸 플랫폼 기반인가?** → `core/`
> 2. **외부 서비스를 래핑하거나 드라이버를 교체해야 하는가?** → `infrastructure/`
> 3. **관리자만 쓰는 엔드포인트인가?** → `system/`
> 4. **그 외 비즈니스 기능** → `features/` ← **대부분의 신규 개발이 여기**

`core/`는 `auth`, `permission` 같은 교차 관심사(cross-cutting concern)를 담고 있어, 일반 비즈니스 기능이 수정할 곳이 아닙니다. 예컨대 게시판이나 배너를 추가할 때는 `features/` 아래에 새 디렉토리를 만드는 것이 올바른 선택입니다.

> ⚠️ **`core.module.ts` vs `core/` 계층**
>
> 루트에 있는 `apps/core-backend/src/core.module.ts`는 **애플리케이션 루트 모듈** (NestJS의 AppModule 역할)로, 이름이 같아 혼동되기 쉽습니다. 이 파일은 네 계층의 모든 모듈을 조립하는 진입점입니다 — `core/` 계층 전용 파일이 *아닙니다*. 루트 모듈에서 `BoardModule`, `BannerModule`, `AdminModule` 등 모든 계층의 모듈을 `imports`에 나열하는 것이 그 증거입니다.

---

## 3.2 NestJS 모듈: weaver2에서의 쓰임

NestJS 모듈(`*.module.ts`)은 weaver2에서 **하나의 기능 단위를 묶는 경계**입니다. `board.module.ts`가 잘 보여 줍니다.

```typescript
// apps/core-backend/src/features/board/board.module.ts
@Module({
  imports: [PrismaModule, UploadLibModule],   // ① 이 모듈이 의존하는 것
  controllers: [
    BoardController,
    PostController,
    CommentController,
    // ... (11개 컨트롤러)
  ],
  providers: [
    BoardService,
    PostService,
    CommentService,
    BoardPermissionService,
    // ...
  ],
  exports: [                                   // ② 다른 모듈에 공개하는 것
    BoardService,
    PostService,
    CommentService,
    BoardPermissionService,
    CategoryService,
    ContentPurgeService,
  ],
})
export class BoardModule {}
```

weaver2의 모듈 패턴에서 중요한 점 세 가지:

**① Repository 클래스는 `providers`에 없다.** 일반적인 NestJS 튜토리얼은 Repository를 `@Injectable()` 클래스로 등록하지만, weaver2는 Repository를 **순수 함수**로 구현합니다(3.3.3에서 자세히). DI 컨테이너에 등록할 필요가 없으므로 `providers` 목록에 나타나지 않습니다.

**② `PrismaModule`을 항상 `imports`에 넣는다.** DB 접근이 필요한 모든 기능 모듈은 `@weaver2/prisma`의 `PrismaModule`을 임포트합니다. `PrismaService`는 이 모듈을 통해 주입받습니다.

**③ `exports`는 다른 모듈이 의존할 Service만.** 컨트롤러는 절대 export하지 않습니다. 다른 모듈이 필요로 하는 Service만 선택적으로 공개합니다. 예를 들어 `SearchModule`이 게시글을 검색하려면 `BoardModule`이 `PostService`를 export해야 합니다.

### 루트 모듈(`core.module.ts`)의 역할

모든 기능 모듈은 루트 모듈(`apps/core-backend/src/core.module.ts`)의 `imports`에 조립됩니다.

```typescript
// apps/core-backend/src/core.module.ts (핵심 부분)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ... }),
    JwtModule.registerAsync({ global: true, ... }),
    ThrottlerModule.forRoot({ ... }),
    EventEmitterModule.forRoot(),
    // --- 계층별 모듈 ---
    UserModule, PrismaModule, PermissionModule, AuthModule,  // core/
    BoardModule, BannerModule, SearchModule, AbuseReportModule, // features/
    EmailModule, UploadModule, AnalyticsModule, SystemSettingModule, // infrastructure/
    AdminModule, HealthModule, StaticModule,  // system/
  ],
  providers: [
    { provide: APP_GUARD, useClass: DevThrottlerGuard },
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');  // 모든 경로에 로그 미들웨어
  }
}
```

`JwtModule`과 `ConfigModule`은 `global: true` / `isGlobal: true`로 등록되어 있어, 개별 기능 모듈이 따로 임포트하지 않아도 어디서나 쓸 수 있습니다.

---

## 3.3 요청의 생애: Controller → Service → Repository

게시글 하나를 가져오는 `GET /v1/posts/:postId` 요청이 코드를 어떻게 통과하는지, 실제 파일을 순서대로 따라갑니다.

```
HTTP GET /v1/posts/:postId
    │
    ▼ [Middleware] RequestLoggerMiddleware (전 경로 로깅)
    ▼ [Guard]      JwtAuthGuard → @Public() 확인 → 비로그인 허용
    ▼ [Interceptor] SuccessInterceptor (응답 래핑 준비)
    ▼ [Pipe]       ValidationPipe (파라미터 검증)
    │
    ▼ Controller  : PostController.findPostById()
    ▼ Service     : PostService.findPostById()
    ▼ Repository  : FindPostByIdQuery(prisma, where)  ← .query.ts
    ▼ Prisma      : prisma.post.findUnique(...)
    ▼ PostgreSQL
    │
    ▲ [Interceptor] SuccessInterceptor → { message: "success", data: PostDto }
    ▲ HTTP 200 응답
```

### 3.3.1 Controller — 입구

`apps/core-backend/src/features/board/controllers/post.controller.ts`

Controller의 책임은 **경로 매핑, 인증 확인, 권한 체크, DTO 바인딩**입니다. 비즈니스 로직은 Service에 위임합니다.

```typescript
@ApiTags('Post')
@Controller({ path: 'posts', version: '1' })   // → /v1/posts
@UseGuards(JwtAuthGuard)                        // 기본: 인증 필요
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly permissionService: BoardPermissionService,
  ) {}

  @Get(':postId')
  @Public()                                       // 비로그인 접근 허용
  @ApiStandardResponses({ type: PostDto })
  async findPostById(
    @Param('postId') postId: string,
    @AuthUser() authUser?: CommonAuthUserDto,    // 로그인 여부와 무관하게 주입
  ): Promise<PostDto> {
    // 1) 게시글을 먼저 조회해 boardId를 알아냄
    const post = await this.postService.findPostById(postId, false, authUser);

    // 2) 읽기 권한 체크
    await this.permissionService.requirePermission(
      post.boardId,
      BoardActionType.READ,
      authUser,
      '게시글 읽기 권한이 없습니다.',
    );

    // 3) 권한 통과 후 조회수 증가와 함께 재조회
    return this.postService.findPostById(postId, true, authUser);
  }
}
```

눈여겨볼 패턴:

| 패턴 | 코드 | 설명 |
|------|------|------|
| `version: '1'` | `@Controller({ path: 'posts', version: '1' })` | URI 버저닝 → `/v1/posts` |
| `@UseGuards(JwtAuthGuard)` | 클래스 레벨 | 기본은 인증 필수 |
| `@Public()` | 메서드 레벨 | JwtAuthGuard가 `isPublic` 메타데이터를 보고 비로그인 허용 |
| `@AuthUser()` | 파라미터 레벨 | `libs/common`의 커스텀 파라미터 데코레이터. 비로그인이면 `undefined` |
| `@ApiStandardResponses()` | 메서드 레벨 | 성공·401·404 Swagger 응답을 한 번에 등록 (3.5에서 설명) |

> 💡 **`@Public()`의 동작 원리**: `libs/common/src/decorator/public.decorator.ts`에서 `SetMetadata('isPublic', true)`를 호출합니다. `JwtAuthGuard`는 요청마다 이 메타데이터를 확인해 `true`이면 토큰 검사를 건너뜁니다. weaver2의 기본 원칙은 **secure-by-default** — 공개가 필요한 곳에만 `@Public()`을 명시합니다.

### 3.3.2 Service — 두뇌

`apps/core-backend/src/features/board/services/post.service.ts`

Service는 **비즈니스 로직의 주체**입니다. Prisma 접근은 직접 하지 않고 Repository 함수를 호출합니다.

```typescript
@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  async findPostById(
    id: string,
    incrementView = false,
    authUser?: CommonAuthUserDto,
  ): Promise<PostDto> {
    const isLoggedIn = authUser?.isLogin === true;
    const whereCondition = {
      id,
      status: 'PUBLISHED' as const,
      deletedAt: null,
      hiddenAt: null,
      ...(!isLoggedIn && { isSecret: false }),  // 비로그인은 비밀글 제외
    };

    // ← Repository 함수 호출 (읽기)
    const post = await FindPostByIdQuery(this.prisma, whereCondition);

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (incrementView) {
      // ← Repository 함수 호출 (쓰기)
      await IncrementPostViewCountCommand(this.prisma, id);
      post.viewCount = post.viewCount + 1;
    }

    return post as PostDto;
  }
}
```

Service의 역할 분담:
- **판단**: 비로그인이면 비밀글 제외, 삭제된 게시글 제외 등
- **에러 처리**: `NotFoundException`, `ForbiddenException` 등 HTTP 예외를 직접 던짐
- **DB 접근 위임**: `FindPostByIdQuery()`, `IncrementPostViewCountCommand()` — Repository 함수로 위임

### 3.3.3 Repository — 손발 (함수형 패턴)

weaver2의 가장 독특한 부분입니다. **Repository가 클래스가 아닌 순수 함수**로 구현됩니다.

#### 읽기 — `*.query.ts`

`apps/core-backend/src/features/board/repositories/find-post-by-id.query.ts`

```typescript
import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;  // 트랜잭션 안에서도 쓸 수 있도록

const POST_INCLUDE = {
  board: true,
  author: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.PostInclude;

export async function FindPostByIdQuery(
  prisma: Db,
  where: Prisma.PostWhereUniqueInput,
) {
  return prisma.post.findUnique({ where, include: POST_INCLUDE });
}
```

#### 쓰기 — `*.command.ts`

`apps/core-backend/src/features/board/repositories/create-post.command.ts`

```typescript
export async function CreatePostCommand(
  prisma: Db,
  data: Prisma.PostCreateInput,
) {
  return prisma.post.create({ data, include: POST_INCLUDE });
}
```

이름 패턴 목록 (board 기준):

| 파일 유형 | 예시 | 하는 일 |
|----------|------|--------|
| `find-*.query.ts` | `find-post-by-id.query.ts` | 단건 조회 |
| `find-all-*.query.ts` | `find-all-boards.query.ts` | 목록 조회 |
| `find-pinned-*.query.ts` | `find-pinned-posts.query.ts` | 조건부 목록 조회 |
| `create-*.command.ts` | `create-post.command.ts` | 생성 |
| `update-*.command.ts` | `update-post.command.ts` | 수정 |
| `delete-*.command.ts` | `delete-post.command.ts` | 삭제 |
| `hide-*.command.ts` | `hide-post.command.ts` | 소프트 숨김 |
| `increment-*.command.ts` | `increment-post-view-count.command.ts` | 카운터 증가 |

> 🔍 **왜 클래스가 아닌 함수인가?**
>
> 전통적인 NestJS 패턴은 `@Injectable() class PostRepository { ... }`이지만, weaver2는 함수를 선택했습니다. 이유는 두 가지입니다.
>
> 1. **단일 책임의 시각화**: 파일 하나 = SQL 쿼리 하나. `find-post-by-id.query.ts`를 열면 그 쿼리만 있습니다. 한 클래스에 모든 메서드를 몰아 넣으면 파일이 거대해집니다.
> 2. **트랜잭션 유연성**: 함수 시그니처가 `(prisma: Db, ...)` — `Db`는 `PrismaClient | Prisma.TransactionClient`의 유니온 타입. 트랜잭션 밖에서도, `prisma.$transaction(async (tx) => { await DeletePostCommand(tx, id); })` 처럼 트랜잭션 안에서도 동일하게 호출할 수 있습니다.
>
> `CHARTER.md §5`는 이를 *"읽기/쓰기 책임을 파일 레벨에서 시각화"*라고 표현합니다.

> 📌 **기억할 것**: Repository 함수는 `@Injectable()`이 없으므로 `board.module.ts`의 `providers`에 등록되지 않습니다. Service가 직접 `import`해서 호출합니다. DI 컨테이너를 거치지 않는 것이 의도적인 설계입니다.

---

## 3.4 DTO와 검증

weaver2는 `class-validator` + `class-transformer`를 사용합니다. DTO 클래스는 **입력 검증**과 **Swagger 문서화**를 동시에 담당합니다.

`apps/core-backend/src/features/board/dto/create-post.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { PostStatus } from '@prisma/client';

export class CreatePostDto {
  @ApiProperty({ description: 'Board ID' })
  @IsString()
  @IsNotEmpty()
  boardId: string;

  @ApiProperty({ description: 'Post title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '고정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: '우선순위', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
```

### 검증 파이프라인

`libs/common/src/global/pipe/index.ts`에서 **전역 `ValidationPipe`**를 설정합니다:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,           // 요청 바디를 DTO 클래스 인스턴스로 변환
    whitelist: true,           // 데코레이터 없는 프로퍼티는 자동 제거
    forbidNonWhitelisted: true, // 알 수 없는 프로퍼티가 오면 에러
    exceptionFactory: (validationErrors) => {
      return new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: [...],
      });
    },
  }),
);
```

`whitelist: true`와 `forbidNonWhitelisted: true`의 조합이 중요합니다 — 클라이언트가 DTO에 없는 필드를 보내면 **422 Unprocessable Entity**로 즉시 거부됩니다. 서비스 레이어까지 오염된 데이터가 도달하지 않습니다.

> 💡 **`transform: true`의 효과**: `@Query('limit') limit: number`처럼 선언하면, URL의 문자열 `"10"`이 숫자 `10`으로 자동 변환됩니다. `ParseIntPipe`를 따로 붙이지 않아도 됩니다.

---

## 3.5 전역 인프라: `libs/common`

`libs/common`은 백엔드 전역에서 자동으로 적용되는 인프라를 담고 있습니다. 진입점은 `main.ts`가 호출하는 `setNestApp()` 함수 (`libs/common/src/global/nest.config.ts`)입니다.

```typescript
// main.ts
setNestApp(app);   // 미들웨어·인터셉터·파이프·필터를 한 번에 등록
```

`setNestApp()` 내부 등록 순서:

```
setMiddleware(app)      → RequestLoggerMiddleware, SecurityMiddleware
setInterceptor(app)     → ClassSerializerInterceptor, SuccessInterceptor
setPipe(app)            → ValidationPipe
setExceptionFilter(app) → HttpExceptionFilter, PrismaClientExceptionFilter
```

### 인터셉터 — 응답 통일

`libs/common/src/global/interceptor/success-response.interceptor.ts`

모든 성공 응답을 **`{ message, data }` 형태로 자동 래핑**합니다.

```typescript
// Controller가 PostDto를 반환하면 →
{
  "message": "success",
  "data": { "id": "...", "title": "..." }
}
```

응답 객체에 `message` 키가 있으면 그 값을 꺼내고 나머지를 `data`에 넣습니다. 없으면 기본값 `"success"`를 씁니다.

### 예외 필터 — 에러 통일

두 개의 전역 필터가 에러 응답을 통일합니다.

| 필터 | 처리 대상 | 출력 형태 |
|------|----------|----------|
| `HttpExceptionFilter` | 모든 예외 (fallback) | `{ success: false, error: { code, message, timestamp, path } }` |
| `PrismaClientExceptionFilter` | `PrismaClientKnownRequestError` | P2002(중복) → 409, P2025(미존재) → 404 |

```typescript
// PrismaClientExceptionFilter — 실제 코드
switch (exception.code) {
  case 'P2002':
    statusCode = HttpStatus.CONFLICT;
    message = `Duplicate field: ${target}`;
    break;
  case 'P2025':
    statusCode = HttpStatus.NOT_FOUND;
    message = 'Record not found';
    break;
}
```

`PrismaClientExceptionFilter`가 Prisma 에러를 먼저 잡아서 적절한 HTTP 상태 코드로 변환하면, Service에서 `ConflictException` 등을 직접 던지지 않아도 됩니다.

### 커스텀 데코레이터

`libs/common/src/decorator/` 아래의 데코레이터들:

| 데코레이터 | 위치 | 역할 |
|----------|------|------|
| `@AuthUser()` | `auth-user.decorator.ts` | 파라미터 데코레이터 — `request.user`에서 `CommonAuthUserDto` 추출. 비로그인이면 `undefined` |
| `@Public()` | `public.decorator.ts` | 메서드/클래스에 `isPublic=true` 메타데이터를 설정 → `JwtAuthGuard`가 인증을 건너뜀 |
| `@ApiStandardResponses()` | `swagger/api-standard-responses.decorator.ts` | 성공 응답 타입 + 401 + 404 Swagger 응답을 한 번에 적용하는 합성 데코레이터 |

`@ApiStandardResponses()` 내부에서 `applyDecorators()`로 여러 Swagger 데코레이터를 조합합니다:

```typescript
// 이 한 줄이
@ApiStandardResponses({ type: PostDto })

// 아래 세 개를 대체
@ApiResponse({ status: 200, type: PostDto })
@ApiResponse({ status: 401, type: UnauthorizedResponseDto })
@ApiResponse({ status: 404, type: NotFoundResponseDto })
```

### NestJS 요청 생명주기 — weaver2 맥락

`libs/common/src/global/nest.config.ts` 파일 끝에 실제로 주석으로 정리되어 있습니다:

```
1. Incoming request
2. Middleware        → RequestLoggerMiddleware (전 경로)
3. Guards           → JwtAuthGuard (@Public() 확인)
4. Interceptors (pre) → ClassSerializerInterceptor, SuccessInterceptor
5. Pipes            → ValidationPipe (DTO 검증)
6. Controller       → PostController.findPostById()
7. Service          → PostService.findPostById()
8. Interceptors (post) → SuccessInterceptor (응답 래핑)
9. Exception filters → HttpExceptionFilter, PrismaClientExceptionFilter
10. Server response
```

> 📌 **기억할 것**: 예외 필터는 **인터셉터보다 나중에** 실행됩니다. 즉 Service에서 `NotFoundException`을 던지면 인터셉터의 래핑은 건너뛰고 필터가 직접 에러 응답을 씁니다. 성공 응답만 `{ message, data }`로 포장됩니다.

---

## 이 장의 요약

- **계층 분류**: `core/`(플랫폼 토대) · `features/`(비즈니스, 신규 개발의 99%) · `infrastructure/`(외부 연동) · `system/`(운영)
- **모듈**: 기능 단위로 컨트롤러·서비스를 묶고, Repository 함수는 DI에 등록하지 않음
- **Repository**: `*.query.ts`(읽기) / `*.command.ts`(쓰기)로 **파일을 분리한 순수 함수** — 클래스가 아님
- **전역 파이프라인**: `setNestApp()` 한 번으로 미들웨어·인터셉터·ValidationPipe·예외필터가 모두 장착됨
- **응답 형태**: 성공 → `{ message, data }` (SuccessInterceptor), 실패 → `{ success: false, error: { ... } }` (HttpExceptionFilter)

→ **[4장 데이터 계층 (Data Layer)](04-data-layer.md)**
