# 9. 실전 가이드 (Recipes)

이 장은 앞서 쌓은 이론을 **실제 작업**으로 연결합니다. 1~8장에서 각 조각을 개별로 익혔다면, 여기서는 "새 기능을 처음부터 끝까지 추가해 보기", "기능을 제거하기", "권한을 추가하기", "테스트를 작성하기"처럼 **여러 장을 꿰어야 하는 작업**을 체크리스트와 함께 정리합니다.

같은 내용을 여기서 다시 설명하지 않습니다. 각 단계는 해당 장을 참조 링크로 연결합니다. 이 장의 역할은 **"어느 순서로, 어디를 건드려야 하나"**를 한눈에 보여 주는 것입니다.

---

## 9.1 새 기능 추가 — end-to-end 체크리스트

8장(§8.1)에서 "한 기능이 7~8곳 이상에 흩어져 있다"는 것을 배웠습니다. board 기준으로는 실제로 **13개 지점**에 걸쳐 있습니다. 아래 체크리스트는 그 13곳을 빠짐없이 건드리기 위한 순서입니다. 예시로 `quiz`라는 새 기능을 만든다고 가정합니다.

> 📌 **왜 순서가 중요한가**: 권한 상수(`libs/shared`)를 먼저 정의해야 시드 파일이 그것을 참조할 수 있고, NestJS 모듈을 루트 모듈에 등록하기 전에 모듈 파일이 있어야 컴파일이 통과합니다. 순서를 지키면 매 단계에서 컴파일이 유지됩니다.

### 백엔드 — 모듈 뼈대 (→ [3장](03-backend-fundamentals.md))

```
[ ] apps/core-backend/src/features/quiz/
    ├── quiz.module.ts              # @Module({ imports: [PrismaModule], ... })
    ├── controllers/
    │   └── quiz.controller.ts      # @Controller({ path: 'quizzes', version: '1' })
    ├── services/
    │   └── quiz.service.ts         # @Injectable()
    ├── repositories/
    │   ├── find-quiz-by-id.query.ts   # 읽기 함수
    │   └── create-quiz.command.ts     # 쓰기 함수
    └── dto/
        ├── create-quiz.dto.ts
        └── quiz.dto.ts
```

파일 명명·구조는 기존 `features/banner/`를 기준으로 맞춥니다 (3장 §3.3 Repository 함수형 패턴 참조).

### Prisma 스키마 추가 (→ [4장](04-data-layer.md))

```
[ ] apps/core-backend/prisma/schema/quiz.prisma   # 새 .prisma 파일 생성
```

```prisma
// apps/core-backend/prisma/schema/quiz.prisma
// Project: quiz

model Quiz {
  id        String   @id @default(cuid())
  title     String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("quizzes")
}
```

`User` 역참조(`User.quizzes`)가 필요하면 `auth.prisma`의 `User` 모델 "Project-specific relations" 섹션에 추가합니다 (4장 §4.5 coreBackrefs 참조).

```bash
[ ] pnpm db:generate   # Prisma Client 타입 갱신
[ ] pnpm db:migrate    # 마이그레이션 파일 생성 + 적용 (개발용)
```

> ⚠️ **스키마를 바꾼 뒤 `db:generate`를 먼저 돌려야** TypeScript 타입이 갱신됩니다. 이를 건너뛰면 Service에서 `prisma.quiz` 접근 시 타입 오류가 납니다.

### 권한 상수 정의 (→ [5장](05-auth-and-permissions.md), [7장](07-libs.md))

```
[ ] libs/shared/src/index.ts   # PERMISSIONS 객체에 QUIZ 네임스페이스 추가
```

```typescript
// libs/shared/src/index.ts
export const PERMISSIONS = {
  // ... 기존 ...
  QUIZ: {
    CREATE: 'quiz:create',
    UPDATE_OWN: 'quiz:update:own',
    UPDATE_ALL: 'quiz:update:all',
    DELETE_OWN: 'quiz:delete:own',
    DELETE_ALL: 'quiz:delete:all',
    ALL: 'quiz:*',
  },
} as const;
```

```
[ ] libs/common/src/constants/permissions.const.ts   # ALL_PERMISSIONS 배열에 추가
```

```typescript
// libs/common/src/constants/permissions.const.ts
export const ALL_PERMISSIONS = [
  // ... 기존 ...
  'quiz:create',
  'quiz:update:own',
  'quiz:update:all',
  'quiz:delete:own',
  'quiz:delete:all',
  'quiz:*',
];
```

> 💡 **순서 이유**: 시드 파일이 `PERMISSIONS.QUIZ.*`를 참조하므로, 상수를 먼저 정의해야 시드 컴파일이 통과합니다.

### 시드 — 권한 그룹에 권한 부여 (→ [4장](04-data-layer.md), [5장](05-auth-and-permissions.md))

```
[ ] apps/core-backend/prisma/seed/quiz-permission.seed.ts   # (선택) 기능 전용 시드
[ ] apps/core-backend/prisma/seed/permission-group.seed.ts  # 기존 그룹에 QUIZ 권한 추가
[ ] apps/core-backend/prisma/seed/seed.ts                   # seedQuizPermission() 호출 등록
```

`permission-group.seed.ts`의 User 그룹 항목에 `PERMISSIONS.QUIZ.CREATE` 등을 추가합니다. Admin 그룹에는 `PERMISSIONS.QUIZ.ALL`을 넣는 것이 일반적인 패턴입니다 (5장 §5.5 시드 6종 그룹 참조).

```bash
[ ] pnpm db:seed   # 권한 그룹 업데이트 반영 (멱등 — 여러 번 실행해도 안전)
```

### 루트 모듈에 등록 (→ [3장](03-backend-fundamentals.md) §3.2)

```
[ ] apps/core-backend/src/core.module.ts
```

```typescript
// core.module.ts — imports 배열에 QuizModule 추가
import { QuizModule } from './features/quiz/quiz.module';

@Module({
  imports: [
    // ... 기존 ...
    QuizModule,   // ← 추가
  ],
})
export class CoreModule {}
```

관리자 API에서도 quiz 관련 서비스를 쓴다면:

```
[ ] apps/core-backend/src/system/admin/api/admin-api.module.ts   # QuizModule 추가
```

### 프론트엔드 feature-slice (→ [6장](06-frontend.md) §6.4)

```
[ ] apps/core-frontend/src/features/quiz/
    ├── types.ts                      # Quiz 타입 정의
    ├── query-keys.ts                 # QUIZ_QUERY_KEYS
    ├── api/
    │   └── quiz.api.ts               # apiClient.get/post/patch/delete 사용
    ├── hooks/
    │   ├── use-quizzes.ts            # useQuery 래핑 (목록)
    │   └── use-quiz.ts               # useQuery 래핑 (단건)
    └── components/
        └── quiz-list.tsx             # semantic 토큰 클래스 사용
```

```typescript
// features/quiz/api/quiz.api.ts
import { apiClient } from '@/infrastructure/api-client';
import type { Quiz } from '../types';

export const quizApi = {
  getAll: () => apiClient.get<Quiz[]>('/v1/quizzes'),
  getById: (id: string) => apiClient.get<Quiz>(`/v1/quizzes/${id}`),
  create: (data: { title: string }) => apiClient.post<Quiz>('/v1/quizzes', data),
};
```

`fetch()` 직접 사용은 절대 금지 — 반드시 `apiClient`를 씁니다 (6장 §6.8 참조).

### 라우트 등록 (→ [6장](06-frontend.md) §6.2)

```
[ ] apps/core-frontend/src/app/(protected)/quizzes/page.tsx   # 인증 필요 페이지
```

```tsx
// app/(protected)/quizzes/page.tsx
import { QuizList } from '@/features/quiz/components/quiz-list';

export default function QuizzesPage() {
  return <QuizList />;
}
```

페이지 파일에는 비즈니스 로직을 두지 않습니다. 컴포넌트 조합만 합니다.

### (선택) 관리자 사이드바·슬롯

관리자 화면이 필요하다면:

```
[ ] apps/core-frontend/src/app/(admin)/admin/quizzes/   # 관리자 라우트
[ ] apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx
    → NAV_ITEMS 배열에 항목 추가
```

모듈 레지스트리의 슬롯 기능(8장 §8.7)을 활용하고 싶다면:

```
[ ] apps/core-frontend/src/features/quiz/dashboard-slots.tsx
    → gen-slot-registry.ts가 자동 감지 (pnpm dev:web 시 재생성)
```

### 매니페스트 등록 (→ [8장](08-module-registry.md) §8.2)

```
[ ] apps/core-backend/src/features/quiz/quiz.feature.ts   # FeatureManifest 작성
[ ] apps/core-backend/src/features/manifests.ts           # ALL_MANIFESTS에 추가
```

```typescript
// apps/core-backend/src/features/quiz/quiz.feature.ts
import type { FeatureManifest } from '@weaver2/module-registry';

export const quizFeature: FeatureManifest = {
  id: 'quiz',
  layer: 'features',
  description: '퀴즈 기능',
  dependsOn: [
    { id: 'auth',       kind: 'hard', reason: 'JwtAuthGuard 사용' },
    { id: 'permission', kind: 'hard', reason: 'RequirePermission 데코레이터' },
  ],
  footprint: {
    backendDir: 'apps/core-backend/src/features/quiz',
    frontendDirs: ['apps/core-frontend/src/features/quiz'],
    prismaSchema: 'apps/core-backend/prisma/schema/quiz.prisma',
    prismaModels: ['Quiz'],
    coreBackrefs: ['User.quizzes'],    // auth.prisma에 추가한 역참조
    permissions: ['PERMISSIONS.QUIZ'],
    seeds: ['apps/core-backend/prisma/seed/quiz-permission.seed.ts'],
    routes: ['apps/core-frontend/src/app/(protected)/quizzes'],
    pinpoints: [
      'apps/core-backend/src/core.module.ts → QuizModule',
      'libs/shared/src/index.ts → PERMISSIONS.QUIZ',
      'libs/common/src/constants/permissions.const.ts → quiz:create …',
      'apps/core-backend/prisma/seed/permission-group.seed.ts → PERMISSIONS.QUIZ.*',
    ],
  },
  removalNotes: [],
};
```

매니페스트를 먼저 작성하면 `pinpoints`가 **"내가 어디를 건드렸나"**의 메모 역할을 해 줍니다. 나중에 `module:extract`를 실행하면 카탈로그 스냅샷도 만들 수 있습니다.

### 13곳 전체 요약

| # | 위치 | 해당 장 |
|---|------|---------|
| 1 | `features/quiz/` 백엔드 모듈 | 3장 |
| 2 | `prisma/schema/quiz.prisma` | 4장 |
| 3 | `auth.prisma` User 역참조 (`coreBackrefs`) | 4장 |
| 4 | `libs/shared/src/index.ts` — PERMISSIONS | 5장, 7장 |
| 5 | `libs/common/.../permissions.const.ts` — ALL_PERMISSIONS | 7장 |
| 6 | `prisma/seed/permission-group.seed.ts` | 4장, 5장 |
| 7 | `prisma/seed/seed.ts` — 진입점 등록 | 4장 |
| 8 | `core.module.ts` — QuizModule import | 3장 |
| 9 | `admin-api.module.ts` — (필요 시) | 3장 |
| 10 | `features/quiz/` 프론트 슬라이스 | 6장 |
| 11 | `app/(protected)/quizzes/` 라우트 | 6장 |
| 12 | `admin-sidebar.tsx` — (필요 시) | 6장 |
| 13 | `quiz.feature.ts` + `manifests.ts` | 8장 |

---

## 9.2 기능 제거

### `pnpm module:remove`의 현실 (→ [8장](08-module-registry.md) §8.8)

`pnpm module:remove <id>` 명령은 **banner에 대해서만 완전히 동작**합니다. banner가 아닌 기능(board, search, abuse-report)에 이 명령을 실행하면:

- ✅ **footprint 파일 삭제**: `backendDir`, `frontendDirs`, `routes`, `prismaSchema`, `seeds` 경로는 id 기반으로 올바르게 삭제됩니다.
- ❌ **등록 해제 편집**: `core.module.ts`, `libs/shared`, `admin-sidebar.tsx` 등의 인라인 편집은 내부적으로 `BANNER_RECIPE` 상수를 참조하므로 엉뚱하게 banner 관련 항목을 찾아 편집합니다.

따라서 **banner가 아닌 기능을 제거할 때는 `pinpoints` 지점을 수동으로 편집**해야 합니다.

> 8장 §8.8의 실용 결론을 참조하세요. 이것은 버그가 아니라 Rule of Three에 따른 의도된 미완성입니다.

### 수동 제거 순서

```bash
# 0. git 워킹트리를 먼저 청결히 (실수 복구를 위해)
git status  # 변경사항 없음이어야 안전
```

```
[ ] 1. libs/shared/src/index.ts — PERMISSIONS.QUIZ 블록 제거
         ⚠️ 먼저 제거하면 시드 파일이 이 상수를 참조해 컴파일 실패
         → 참조하는 쪽(시드)을 먼저 정리하고, 이 파일을 나중에 정리할 것

[ ] 2. prisma/seed/permission-group.seed.ts — PERMISSIONS.QUIZ.* 항목 제거
[ ] 3. prisma/seed/seed.ts — seedQuizPermission() 호출 제거
[ ] 4. libs/common/src/constants/permissions.const.ts — quiz:* 항목 제거
[ ] 5. core.module.ts — QuizModule import·imports 배열 항목 제거
[ ] 6. admin-api.module.ts — (필요 시) QuizModule 제거
[ ] 7. admin-sidebar.tsx — nav 항목 제거 (필요 시)
[ ] 8. auth.prisma User 모델 — User.quizzes 역참조 필드 제거
[ ] 9. apps/core-backend/src/features/quiz/ — 디렉토리 삭제
[ ] 10. apps/core-frontend/src/features/quiz/ — 디렉토리 삭제
[ ] 11. apps/core-frontend/src/app/(protected)/quizzes/ — 라우트 삭제
[ ] 12. apps/core-backend/prisma/schema/quiz.prisma — 삭제
[ ] 13. manifests.ts — quizFeature 항목 제거
```

```bash
# 파일 정리 후 DB 마이그레이션
[ ] pnpm db:generate                            # quiz.prisma 삭제 반영 (Quiz 타입 제거)
[ ] pnpm db:migrate --name drop_quiz            # quizzes 테이블 DROP (데이터 영구 삭제)
```

> ⚠️ **`db:migrate`는 데이터를 영구 삭제합니다.** 프로덕션에서는 `prisma migrate deploy`를 사용하고, 롤백 계획을 먼저 수립하세요.

```bash
# 최종 확인
[ ] pnpm build:core     # 컴파일로 남은 참조가 없는지 확인 (별도 typecheck 스크립트는 없음)
[ ] pnpm test           # 단위 테스트 통과 확인
```

---

## 9.3 권한 추가하기 (→ [5장](05-auth-and-permissions.md), [7장](07-libs.md))

기존 기능에 새 권한 문자열을 추가하는 흐름입니다. 예: `quiz:publish` 권한을 추가한다고 가정합니다.

### 1단계 — `libs/shared`에 상수 정의

```typescript
// libs/shared/src/index.ts
export const PERMISSIONS = {
  QUIZ: {
    CREATE: 'quiz:create',
    // ... 기존 ...
    PUBLISH: 'quiz:publish',   // ← 추가
  },
} as const;
```

### 2단계 — `ALL_PERMISSIONS` 배열에 추가

```typescript
// libs/common/src/constants/permissions.const.ts
export const ALL_PERMISSIONS = [
  // ...
  'quiz:publish',   // ← 추가
];
```

### 3단계 — 권한 그룹 시드에 반영

어느 그룹이 이 권한을 가질지 결정하고 `permission-group.seed.ts`에 추가합니다.

```typescript
// apps/core-backend/prisma/seed/permission-group.seed.ts
const GROUPS = [
  {
    name: 'Admin',
    permissions: [
      // ...
      PERMISSIONS.QUIZ.PUBLISH,   // ← 추가
    ],
  },
  // ...
];
```

```bash
[ ] pnpm db:seed   # 권한 그룹 업데이트 (멱등)
```

> ⚠️ **권한 캐시 주의**: 기본 캐시 TTL은 5분입니다. 권한을 추가한 뒤 즉시 반영이 안 되면 `PERMISSION_CACHE_STRATEGY=none`을 `.env`에 설정하거나 서버를 재시작하세요 (5장 §5.5 권한 캐시 참조).

### 4단계 — 백엔드 가드 적용

```typescript
// features/quiz/controllers/quiz.controller.ts
import { PERMISSIONS } from '@weaver2/shared';

@RequirePermission(PERMISSIONS.QUIZ.PUBLISH)  // 타입 안전하게
@Post(':id/publish')
publish(@Param('id') id: string) { ... }
```

### 5단계 — 프론트엔드 조건부 렌더링

```typescript
// features/quiz/components/quiz-actions.tsx
import { PERMISSIONS, hasPermission } from '@weaver2/shared';

function QuizActions({ userPermissions }: { userPermissions: string[] }) {
  const canPublish = hasPermission(userPermissions, PERMISSIONS.QUIZ.PUBLISH);
  return canPublish ? <PublishButton /> : null;
}
```

또는 `shared/components/auth/RequirePermission` 컴포넌트를 쓸 수 있습니다 (6장 §6.5 참조).

### 요약

| 단계 | 파일 | 왜 |
|------|------|---|
| 1 | `libs/shared/src/index.ts` | 권한 문자열의 진실은 한 곳에만 |
| 2 | `libs/common/.../permissions.const.ts` | 전체 권한 목록 (`ALL_PERMISSIONS`) |
| 3 | `prisma/seed/permission-group.seed.ts` + `pnpm db:seed` | 그룹에 권한 할당 |
| 4 | 백엔드 Controller에 `@RequirePermission()` | 서버사이드 강제 |
| 5 | 프론트엔드 컴포넌트에 `hasPermission()` | UI 조건부 렌더링 |

---

## 9.4 테스트 작성

weaver2에는 세 가지 테스트 레이어가 있습니다.

| 레이어 | 도구 | 위치 | 실행 명령 |
|--------|------|------|----------|
| **단위(Unit)** | Jest | 소스 파일 옆 `*.spec.ts` | `pnpm test` |
| **통합(Integration)** | Jest + supertest + 실제 DB | `apps/core-backend/test/integration/` | `pnpm test:integration` |
| **E2E** | Playwright | `apps/core-frontend/e2e/` | `pnpm test:e2e` |

### 단위 테스트 (`*.spec.ts`)

Service·유틸리티처럼 DB나 HTTP에 의존하지 않는 로직을 검증합니다. 파일은 테스트 대상 소스 옆에 둡니다.

```
apps/core-backend/src/features/quiz/services/quiz.service.spec.ts
```

```typescript
// quiz.service.spec.ts — 실제 libs/shared/src/index.spec.ts 패턴 참조
import { QuizService } from './quiz.service';

describe('QuizService', () => {
  let service: QuizService;
  // PrismaService를 jest.fn()으로 mock
  const mockPrisma = { quiz: { findUnique: jest.fn(), create: jest.fn() } };

  beforeEach(() => {
    service = new QuizService(mockPrisma as any);
  });

  it('존재하지 않는 quiz 조회 시 NotFoundException을 던진다', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(null);
    await expect(service.findById('non-existent')).rejects.toThrow('NotFoundException');
  });
});
```

```bash
pnpm test            # 단위 테스트 전체 실행 (프로젝트 선택 프롬프트가 나옵니다)
pnpm test:watch      # watch 모드
pnpm test:cov        # 커버리지 포함
```

> 💡 `pnpm test`는 `scripts/run-test.sh`를 호출해 프로젝트(`core-backend` 또는 `core-frontend`)를 선택합니다. `apps/{project}/jest.config.js`를 읽어 실행합니다.

### 통합 테스트 (Integration)

실제 DB와 NestJS 앱 인스턴스를 사용해 **요청이 실제로 차단/통과되는지**를 검증합니다. 단위 테스트로는 잡기 어려운 Guard·Middleware 연동을 확인합니다.

```
apps/core-backend/test/integration/quiz-security.integration.spec.ts
```

`auth-security.integration.spec.ts`가 표준 패턴을 보여 줍니다:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@weaver2/prisma';
import { createTestApp, closeTestApp, getTestingModule } from './helpers/test-app.helper';
import { loginAs } from './helpers/auth.helper';

describe('Quiz Security (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('권한 없는 유저는 POST /v1/quizzes에 403을 받는다', async () => {
    const cookies = await loginAs(app, 'user_without_permission@test.local', 'pass');
    await request(app.getHttpServer())
      .post('/v1/quizzes')
      .set('Cookie', cookies)
      .send({ title: 'Test' })
      .expect(403);
  });
});
```

```bash
pnpm test:integration   # 통합 테스트 실행 (실제 DB 필요 — .env DATABASE_URL 확인)
```

> ⚠️ **통합 테스트는 실제 DB를 씁니다.** 테스트 중 생성한 레코드를 `afterEach`/`afterAll`에서 반드시 정리(`prisma.quiz.deleteMany(...)`)하세요. `auth-security.integration.spec.ts`의 `createdUserIds` 패턴을 참조합니다.

### E2E 테스트 (Playwright)

브라우저를 실제로 구동해 전체 흐름(Next.js → proxy → NestJS → DB)을 검증합니다.

```
apps/core-frontend/e2e/quiz-create.spec.ts
```

`auth-login.spec.ts`가 표준 패턴을 보여 줍니다:

```typescript
import { test, expect } from '@playwright/test';

// E2E는 시드 계정에 의존합니다 (admin@weaver.com / secret!!)
const ADMIN_EMAIL = 'admin@weaver.com';
const ADMIN_PASSWORD = 'secret!!';

test.describe('Quiz — 생성 흐름', () => {
  test('관리자가 퀴즈를 생성하면 목록에 나타난다', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('[name=email]', ADMIN_EMAIL);
    await page.fill('[name=password]', ADMIN_PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL('/dashboard');

    // 퀴즈 생성
    await page.goto('/quizzes/new');
    await page.fill('[name=title]', 'E2E 테스트 퀴즈');
    await page.click('button[type=submit]');

    // 목록에서 확인
    await page.goto('/quizzes');
    await expect(page.getByText('E2E 테스트 퀴즈')).toBeVisible();
  });
});
```

```bash
pnpm test:e2e   # Playwright E2E 실행 (백엔드 + 프론트엔드 서버가 떠 있어야 합니다)
```

> 📌 **E2E 테스트 전제조건**: DB가 마이그레이션·시드 완료 상태여야 합니다(`pnpm db:migrate` + `pnpm db:seed`). 시드 계정(`admin@weaver.com`)이 없으면 로그인이 실패합니다. 백엔드(`:4000`)와 프론트(`:3000`) 서버가 모두 실행 중이어야 합니다.

### 어느 레이어를 써야 하나

| 검증하고 싶은 것 | 권장 레이어 |
|----------------|------------|
| Service의 비즈니스 로직 (순수 함수 판단) | 단위 |
| Repository 함수가 올바른 쿼리를 만드나 | 단위 (Prisma mock) |
| Guard가 실제로 요청을 차단하나 | 통합 |
| 권한 없는 사용자가 403을 받나 | 통합 |
| 로그인 → 페이지 이동 → 데이터 표시 전체 흐름 | E2E |
| 폼 제출 후 목록 갱신 | E2E |

---

## 이 장의 요약

- **새 기능 추가**: 백엔드 모듈 → Prisma 스키마/migrate → 권한 상수 → 시드 → 루트 모듈 등록 → 프론트 feature-slice → 라우트 → 매니페스트. **13곳을 순서대로** 건드린다.
- **기능 제거**: `pnpm module:remove`는 banner에 한해서만 완전 자동. 다른 기능은 `pinpoints`를 참고해 수동 편집 후 빌드(`pnpm build:core`/`build:web`)로 검증.
- **권한 추가**: `libs/shared` 상수 → `ALL_PERMISSIONS` → 시드 → `@RequirePermission()` 가드 → 프론트 조건부 렌더링. 순서를 지키면 매 단계에서 컴파일이 유지됨.
- **테스트**: 단위(`pnpm test`) → 통합(`pnpm test:integration`) → E2E(`pnpm test:e2e`) 세 레이어. 통합과 E2E는 실제 DB와 시드 데이터가 필요함.

---

→ **[10장 참고 (Reference)](10-reference.md)**
