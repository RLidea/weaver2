# 10. 새 기능 만들기 — 엔티티 하나 얹는 전체 워크스루

> "새 엔티티(레코드 CRUD) 하나"를 스키마부터 화면·테스트까지 얹는 순서를 처음부터 끝까지 따라갑니다.
> AI 협업용 압축판은 [`.agents/skills/weaver-crud-recipe/SKILL.md`](../../.agents/skills/weaver-crud-recipe/SKILL.md) — 이 장은 그 레시피의 사람용 해설입니다.

## 시작 전에 — 두 가지 원칙

1. **미러링 본보기는 Board입니다.** 가장 단순한 레코드 CRUD(name/description + soft-delete + audit)라서입니다. Post는 확장형(keyset·카테고리·첨부) 참고용.
2. **Board에서 이것들은 베끼지 마세요** — 커뮤니티 도메인 특수 기능이지 표준 세트가 아닙니다: 대댓글, 리액션·이모지, 고정글, 카테고리, 조회수, 콘텐츠 퍼지 스케줄러, 신고 연동. 첨부·검색·알림도 기본 미포함 add-on입니다 (필요할 때만).

아래에서 새 엔티티 이름을 `Project`(테이블 `projects`)라고 가정합니다.

## 1단계 — 스키마와 마이그레이션

```
apps/core-backend/prisma/schema/project.prisma   ← 새 파일 (폴더가 곧 스키마, 등록 절차 없음)
```

Board 모델을 미러링합니다:

```prisma
model Project {
  id          String    @id @default(uuid())
  name        String    @unique          // 자연키 (시드 멱등성의 기준)
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?                  // soft-delete

  @@map("projects")                      // snake_case 복수형
}
```

규칙: FK는 `{참조모델}Id` 카멜케이스 (CRITICAL 규칙), enum이 필요하면 같은 파일에. 그리고:

```bash
pnpm db:migrate     # prisma migrate dev — 마이그레이션 생성 + client 재생성
```

## 2단계 — 권한 정의

권한을 코드보다 먼저 정합니다 (컨트롤러에서 바로 쓰므로):

1. **`libs/shared/src/index.ts`** — `PERMISSIONS.PROJECT` 블록 추가 + **하단 `Permission` union 타입에도 추가** (빠뜨리기 쉬움):
   ```ts
   PROJECT: { CREATE: 'project:create', READ: 'project:read', UPDATE: 'project:update', DELETE: 'project:delete' }
   // ...
   | (typeof PERMISSIONS.PROJECT)[keyof typeof PERMISSIONS.PROJECT]
   ```
2. **`libs/common/src/constants/permissions.const.ts`** — 관리자 UI 라벨(`ALL_PERMISSIONS`)에 항목 추가
3. **`prisma/seed/permission-group.seed.ts`** — 어느 그룹이 이 권한을 갖는지 배열에 추가 (시드가 소스 오브 트루스, 재실행 시 diff 동기화)
4. 게시판처럼 인스턴스별 접근 제어가 필요하면 `board-permission.seed.ts` 패턴으로 ResourcePermission 시드 추가 → [04장 §6](04-permissions.md#6-리소스-권한-resourcepermission)

## 3단계 — 백엔드 feature 모듈

`apps/core-backend/src/features/project/` — Board 미러:

```
project/
├── controllers/project.controller.ts       # 5종: 목록·단건·생성·수정·삭제
├── services/project.service.ts
├── repositories/
│   ├── find-all-projects.query.ts           # 읽기 — deletedAt: null 필터
│   ├── find-project-by-id.query.ts
│   ├── create-project.command.ts            # 쓰기
│   ├── update-project.command.ts
│   └── delete-project.command.ts            # soft-delete (deletedAt 설정)
├── dto/{project,create-project,update-project}.dto.ts
└── project.module.ts
```

기억할 관례 ([01장 §3](01-backend.md#3-레포지토리-패턴--cqrs-파일-분리)):

- 레포지토리는 **`PrismaClient`를 첫 인자로 받는 순수 함수** — providers 등록 불필요
- secure-by-default: 공개할 라우트에만 `@Public()`, 권한 필요한 라우트에 `@RequirePermission(PERMISSIONS.PROJECT.CREATE)` (가드는 전역이라 `@UseGuards` 불필요)
- 중복 방지는 사전 조회 + `ConflictException`, 또는 `@@unique` + P2002 catch
- 목록이 커질 API는 처음부터 keyset + 프리셋 + 인덱스 → [07장 §2](07-board-reference.md#2-키셋-페이지네이션--목록-조회의-표준)

**모듈 등록 2곳** (잊기 쉬움):

- `apps/core-backend/src/core.module.ts` imports에 `ProjectModule`
- 관리자 API를 노출한다면 `src/system/admin/api/admin-api.module.ts`에도

## 4단계 — 프론트엔드

### 공개 화면

```
apps/core-frontend/src/features/project/
├── api/project.api.ts          # apiClient 필수 (fetch() 금지)
├── hooks/use-projects.ts, use-project.ts, use-project-mutations.ts
├── components/project-list.tsx, project-detail.tsx
├── query-keys.ts
└── types.ts

apps/core-frontend/src/app/(protected)/projects/page.tsx        # 진입점만
apps/core-frontend/src/app/(protected)/projects/[id]/page.tsx
```

### 관리자 화면

```
apps/core-frontend/src/features/admin/projects/
├── api/admin-projects.api.ts
├── components/project-table.tsx           # DataTable 사용
│            project-create-modal.tsx, project-edit-modal.tsx, project-delete-dialog.tsx
├── hooks/use-admin-projects.ts, use-admin-project-mutations.ts
├── query-keys.ts
└── types.ts

apps/core-frontend/src/app/(admin)/admin/projects/page.tsx
```

+ `AdminSidebar`의 `NAV_ITEMS`에 메뉴 항목(권한 지정) 추가.

지킬 규칙 ([08장](08-frontend.md)): 목록 필터·정렬은 URL 상태로, 색상은 semantic 토큰만, 테이블은 `DataTable`, 권한 노출 제어는 `hasPermission`/`RequirePermission`. 목록·모달 골격은 기존 admin 슬라이스를 미러링하면 되지만 **폼 필드는 엔티티 타입에 맞게 직접** 만듭니다 (레시피가 "완전 자동"을 약속하지 않는 부분).

## 5단계 — 시드와 테스트

1. (선택) 시드: 자연키 멱등 패턴으로 `prisma/seed/project.seed.ts` + `seed.ts` 오케스트레이터에 등록 (CHARTER §7.1 — 시그니처 `seedXxx(prisma)`)
2. **서비스 유닛 테스트** `services/project.service.spec.ts` — 생성자 목 주입 패턴 ([09장 §1](09-testing.md#1-유닛-테스트))
3. 권한이 걸린 API면 통합 테스트, 핵심 여정이면 e2e spec 고려

## 6단계 — 검증 체크리스트

```bash
pnpm db:migrate && pnpm db:seed    # 스키마·시드
pnpm lint && pnpm test             # 품질 게이트 (pre-commit도 강제)
pnpm dev                           # Swagger(:4000/docs)에서 5종 API 확인
```

- [ ] `@Public()` 안 붙인 라우트가 비로그인에서 401인가
- [ ] 권한 없는 계정(시드 `weaver`)으로 관리 API가 403인가
- [ ] soft-delete 후 목록에서 사라지는가 (`deletedAt` 필터)
- [ ] 관리자 메뉴가 권한 없는 계정에게 숨는가
- [ ] 시드 재실행이 멱등인가 (`pnpm db:seed` 2회)

## 레시피의 신선도 규칙

`weaver-crud-recipe` 스킬에는 **"사용 전 미러링 포인터가 현재 코드와 일치하는지 확인하고, 어긋나면 문서를 먼저 고친다"**는 규칙이 있습니다. 이 핸드북도 같은 원칙입니다 — 이 장을 따라가다 코드와 다른 부분을 발견하면, 그것이 곧 문서 수정 PR 거리입니다.

## 더 보기

- AI 협업용 레시피 원문: [`.agents/skills/weaver-crud-recipe/SKILL.md`](../../.agents/skills/weaver-crud-recipe/SKILL.md)
- 레시피 설계 배경: [`docs/design/specs/2026-07-10-weaver2-crud-recipe-design.md`](../design/specs/2026-07-10-weaver2-crud-recipe-design.md)
- 언제 추상화하고 언제 참는가: [`CHARTER.md`](../../CHARTER.md) §5.1
- 프로젝트 분기(새 프로젝트 시작) 체크리스트: [`CHARTER.md`](../../CHARTER.md) §9
