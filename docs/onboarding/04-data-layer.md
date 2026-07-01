# 4. 데이터 계층 (Data Layer)

이 장은 weaver2가 **Prisma를 어떻게 쓰는지**를 다룹니다. Prisma 문법 자체는 [공식 문서](https://www.prisma.io/docs)에 맡기고, 이 가이드는 weaver2 특유의 선택 — 스키마 파일 분리, 시드 멱등성 원칙, keyset 페이지네이션, coreBackrefs 패턴 — 에만 집중합니다.

---

## 4.1 도메인별로 분리된 Prisma 스키마

일반적인 Prisma 프로젝트는 `prisma/schema.prisma` 파일 하나에 모든 모델을 넣습니다. weaver2는 대신 **도메인별로 파일을 나눕니다.**

```
apps/core-backend/prisma/schema/
├── _config.prisma        ← generator + datasource (전역 설정)
├── auth.prisma           ← User, LocalCredential, OAuthAccount, RefreshToken …
├── permissions.prisma    ← PermissionGroup, UserPermissionGroup, ResourcePermission …
├── notification.prisma   ← Notification, PushSubscription
├── terms.prisma          ← TermsAndConditions, UserTermsAgreement
├── email.prisma          ← EmailTemplate, EmailLog
├── system.prisma         ← SystemSetting, PageView, MonthlyAnalyticsReport …
├── board.prisma          ← Board, Post, Comment, PostCategory, Emoji, PostReaction, PostFile
├── banner.prisma         ← Banner
└── abuse-report.prisma   ← AbuseReport
```

### 왜 나눴나

| 단일 schema.prisma | weaver2의 분리 스키마 |
|-------------------|----------------------|
| 파일이 수천 줄로 불어난다 | 도메인 경계가 파일 단위로 시각화된다 |
| 기능 제거 시 어디를 지워야 할지 모호 | `board.prisma`를 통째로 삭제하면 됨 (8장 모듈 레지스트리의 자동화 기반) |
| 모든 모델이 뒤섞임 | `// Framework:` vs `// Project:` 주석으로 "교체 가능"과 "기반"이 구분됨 |

실제로 각 파일 맨 위 주석이 **Framework** (건드리기 어려운 기반) 또는 **Project** (기능 단위로 잘라낼 수 있는 것)를 구분해 선언합니다.

`_config.prisma`는 `generator client`와 `datasource db`만 담습니다. Prisma가 디렉터리를 `--schema=apps/core-backend/prisma/schema`로 받으면 폴더 안의 모든 `.prisma` 파일을 병합해 처리합니다.

> 📌 **기억할 것**: 스키마 파일을 추가·수정할 때는 해당 도메인 파일에만 손댑니다. `_config.prisma`는 설정 전용이므로 모델을 넣지 않습니다.

---

## 4.2 마이그레이션 워크플로

2장에서 소개한 세 명령의 내부 동작을 이제 조금 더 자세히 봅니다.

```bash
pnpm db:generate   # Prisma Client 재생성 (스키마 변경 후 항상)
pnpm db:migrate    # migrate dev (마이그레이션 파일 생성 + 적용, 개발 전용)
pnpm db:reset      # migrate reset (DB 초기화 → migrate → seed 재실행)
```

실제로 이 명령들이 하는 일:

```
db:generate  → dotenv -e apps/core-backend/.env -- prisma generate
                 --schema=apps/core-backend/prisma/schema

db:migrate   → dotenv -e apps/core-backend/.env -- prisma migrate dev
                 --schema=apps/core-backend/prisma/schema

db:reset     → dotenv -e apps/core-backend/.env -- prisma migrate reset
                 --schema=apps/core-backend/prisma/schema
```

`dotenv -e apps/core-backend/.env`가 앞에 붙는 이유는 모노레포에서 환경 변수 파일 위치가 루트가 아닌 앱 디렉터리 안에 있기 때문입니다.

> ⚠️ **주의** — `pnpm db:migrate`(= `migrate dev`)는 개발 환경 전용입니다. 프로덕션 배포에는 `prisma migrate deploy`를 씁니다. 이 둘은 동작이 다릅니다. 로컬에서는 항상 `db:migrate`를 쓰세요.

> 💡 **스키마를 바꿨다면** 반드시 `pnpm db:generate`를 먼저 돌려야 TypeScript 타입이 갱신됩니다. 빌드는 성공해도 Prisma Client 타입이 낡은 상태로 남아 런타임 에러가 나는 함정에 빠지기 쉽습니다.

---

## 4.3 시드 원칙 — 멱등성과 자연키

시드 파일은 `apps/core-backend/prisma/seed/` 아래에 있습니다.

```
prisma/seed/
├── seed.ts                       ← 진입점 (순서 제어)
├── user.seed.ts                  ← 시드 사용자 (★ 유일하게 ID 하드코딩)
├── permission-group.seed.ts      ← 권한 그룹 + 권한 목록
├── user-permission-group.seed.ts ← 사용자 ↔ 권한 그룹 연결
├── board-permission.seed.ts
├── banner-permission.seed.ts
├── email-templates.seed.ts
├── emoji.seed.ts
├── post.seed.ts
└── seed-logger.ts
```

`CHARTER.md §7.1`이 정의한 **시드 4원칙**:

1. **자연키 멱등성** — `username` / `name` / `code` / `version` 같은 자연키로 존재 여부를 먼저 확인하고, 없을 때만 생성합니다. 이미 있으면 건너뜁니다.
2. **ID 하드코딩은 `user.seed.ts` 한정** — leetspeak 패턴의 ID (`...op3r4t0r`, `...m0d3r4t0`)가 디버깅 자산 및 e2e 픽스처용으로 고정되어 있습니다. **다른 시드는 이 패턴을 쓰지 않습니다.**
3. **다른 시드는 자연키 lookup으로 ID 획득** — 예를 들어 `user-permission-group.seed.ts`는 `prisma.user.findUnique({ where: { username } })`로 ID를 얻은 다음 관계를 생성합니다.
4. **시그니처 통일** — `export async function seedXxx(prisma: PrismaClient): Promise<void>`. 각 시드 함수가 직접 `new PrismaClient()`를 만들지 않습니다. `seed.ts`가 하나의 클라이언트를 만들어 전달합니다.

### 멱등성이 실제로 어떻게 동작하나

`permission-group.seed.ts`가 좋은 예입니다.

```typescript
// ① 자연키(name)로 존재 확인
const existing = await prisma.permissionGroup.findUnique({
  where: { name: groupData.name },
  include: { permissions: true },
});

if (!existing) {
  // ② 없으면 그룹과 권한을 한 번에 생성
  await prisma.permissionGroup.create({ data: { ...groupData, permissions: { create: [...] } } });
} else {
  // ③ 있으면 코드 기준과 비교해 권한 diff만 적용 (add/remove)
  await prisma.$transaction([...toAdd.map(...), ...toRemove.map(...)]);
}
```

`pnpm db:seed`를 두 번 돌려도 DB가 깨지지 않습니다. `db:reset` 후 시드도 이 덕분에 안전합니다.

> 🔍 **통찰** — 이 멱등성 원칙은 단순한 편의가 아닙니다. 팀원이 스키마 변경 후 `db:reset`을 돌릴 때, 또는 CI가 테스트 DB를 매번 리셋할 때 시드가 항상 일관된 초기 상태를 만들어 주어야 하기 때문입니다.

---

## 4.4 Keyset 페이지네이션 (`libs/pagination`)

게시판 무한스크롤에는 `OFFSET` 방식 대신 **keyset(커서 기반) 페이지네이션**을 씁니다. 이 로직은 `libs/pagination`에 독립 라이브러리로 분리되어 있습니다.

```
libs/pagination/src/
├── keyset/
│   ├── keyset-pagination.service.ts   ← 핵심 paginate() 메서드
│   ├── keyset.builder.ts              ← WHERE 조건 생성
│   ├── keyset.presets.ts              ← 정렬 preset 정의
│   └── dto/
├── cursor/                            ← 커서 인코딩/디코딩
├── common/                            ← 상수 (DEFAULT_LIMIT 등)
└── offset/                            ← 오프셋 방식 (관리자 목록 등)
```

### 왜 OFFSET을 쓰지 않나

| OFFSET | Keyset |
|--------|--------|
| `LIMIT 20 OFFSET 200` → 201번째 row까지 스캔 | 마지막 row의 키 이후만 읽음 |
| 중간에 글이 추가되면 다음 페이지에서 중복·누락 발생 | 커서가 특정 row를 가리키므로 삽입에 안전 |
| 페이지 번호가 커질수록 느려짐 | 인덱스 범위 스캔 — 페이지 수와 무관하게 일정한 성능 |

무한스크롤은 "다음 20개"만 연속으로 가져오는 패턴이므로 keyset이 자연스러운 선택입니다.

### 사용법 — `KeysetPaginationService.paginate()`

실제 사용처인 `apps/core-backend/src/features/board/services/post.service.ts`:

```typescript
return KeysetPaginationService.paginate<PostDto>({
  prisma: this.prisma.post,
  preset: 'created-at',   // ← keyset.presets.ts에 등록된 preset 이름
  cursor: query.cursor,
  limit: query.limit,
  where: { boardId, status: PostStatus.PUBLISHED },
});
```

`preset`이 정렬 기준과 커서 필드를 선언합니다. 현재 등록된 preset은 두 가지:

| preset | 정렬 기준 | 용도 |
|--------|-----------|------|
| `created-at` | `createdAt DESC, id ASC` | 최신순 목록 |
| `view-count` | `viewCount DESC, id ASC` | 조회수 순 목록 |

마지막 필드가 항상 `id`(tiebreaker)인 것에 주의하세요 — 같은 `createdAt`이 여러 row에 있을 때 순서를 고정하기 위해서입니다.

새 정렬 기준이 필요하면 `libs/pagination/src/keyset/keyset.presets.ts`의 `KEYSET_PRESETS`에 항목을 추가하고, 해당 인덱스가 DB에 있는지 확인합니다. board.prisma에서 그 예시를 볼 수 있습니다:

```prisma
@@index([createdAt(sort: Desc), id], map: "post_cursor_idx")
@@index([viewCount(sort: Desc), id],  map: "post_viewcount_cursor_idx")
```

> 💡 **Offset 방식은 아예 없나요?** `libs/pagination/src/offset/`에 있습니다. 관리자 목록처럼 정확한 페이지 번호가 필요하고 데이터가 많지 않은 곳에 씁니다.

---

## 4.5 coreBackrefs — 모듈이 코어 모델에 주입하는 역참조

weaver2에서 "기능 하나"는 여러 파일에 흩어져 있습니다(1장 참고). DB 관계도 마찬가지입니다. `Banner`를 만든 사람은 `User`이므로, `Banner → User` 외래 키와 함께 `User` 쪽에 역참조 필드(`User.banners`)가 필요합니다.

그런데 `User` 모델은 `auth.prisma`(Framework 영역)에 있고, `Banner`는 `banner.prisma`(Project 영역)에 있습니다. **framework 파일에 project 종속성이 침투하는 것**이지요.

weaver2는 이를 `auth.prisma`의 `User` 모델 안에 명시적 섹션으로 구분해 관리합니다:

```prisma
// apps/core-backend/prisma/schema/auth.prisma
model User {
  // ... 코어 필드들 ...

  // Project-specific relations (board)
  posts     Post[]
  comments  Comment[]
  reactions PostReaction[]
  files     PostFile[]

  // Project-specific relations (banner)
  banners   Banner[]

  // Project-specific relations (abuse report)
  abuseReportsMade    AbuseReport[] @relation("AbuseReportsMade")
  abuseReportsHandled AbuseReport[] @relation("AbuseReportsHandled")

  @@map("users")
}
```

이 역참조 필드들이 **coreBackrefs**입니다. 각 기능 모듈의 `FeatureManifest`에 선언됩니다:

```typescript
// apps/core-backend/src/features/board/board.feature.ts
footprint: {
  coreBackrefs: ['User.posts', 'User.comments', 'User.reactions', 'User.files'],
  // ...
}

// apps/core-backend/src/features/banner/banner.feature.ts
footprint: {
  coreBackrefs: ['User.banners'],
  // ...
}
```

왜 이렇게 추적하나? **모듈 제거 시 자동으로 정리하기 위해서**입니다. 8장에서 설명할 `scripts/module/` 도구가 모듈을 제거할 때 `FeatureManifest.footprint.coreBackrefs`를 읽어 `auth.prisma`에서 해당 필드를 자동으로 제거합니다(`scripts/module/lib/prisma-backref.ts`). 이 스크립트는 멱등하게 동작합니다 — 필드가 이미 없으면 skip합니다.

> 📌 **기억할 것**: `User` 모델에 새 역참조 필드를 추가할 때는 반드시 해당 기능의 `FeatureManifest.footprint.coreBackrefs`에도 등록하세요. 그렇지 않으면 모듈 제거 스크립트가 해당 필드를 남겨 두어 컴파일 에러가 발생합니다.

> 🔍 **통찰** — coreBackrefs는 "DB 관계"와 "모듈 경계"의 긴장을 다루는 해법입니다. Prisma가 관계 무결성을 위해 양방향 선언을 강제하지만, weaver2는 그 역참조 필드가 어느 모듈 소유인지를 매니페스트에 명시해 추적합니다. 이것이 8장 모듈 레지스트리와 연결되는 지점입니다.

---

## 소결 — 데이터 계층 요약

| 주제 | 핵심 |
|------|------|
| 스키마 분리 | `prisma/schema/*.prisma` — Framework / Project 구분, 기능 단위 파일 |
| 마이그레이션 | `db:generate` → `db:migrate` (dev 전용) → `db:reset` |
| 시드 원칙 | 자연키 멱등, ID 하드코딩은 `user.seed.ts`만, 시그니처 통일 |
| 페이지네이션 | `libs/pagination` keyset — 무한스크롤에 offset 대신 커서 기반 |
| coreBackrefs | 기능 모듈이 `User` 등 코어 모델에 주입하는 역참조 필드 — 매니페스트로 추적·자동 정리 |

---

→ **[5장 인증과 권한 (Auth & Permissions)](05-auth-and-permissions.md)**
