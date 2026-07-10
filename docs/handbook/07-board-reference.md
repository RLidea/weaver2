# 07. 게시판 — 레퍼런스 도메인 해부

> 게시판·댓글·리액션·검색·신고는 weaver2의 본질이 아니라 **CRUD 패턴의 레퍼런스 예시**입니다 (CHARTER §1).
> 그래서 이 장은 기능 소개가 아니라 **패턴 해부**입니다 — 새 도메인을 만들 때 여기서 무엇을 베끼면 되는지를 중심으로 읽으세요.
> 코드 위치: `apps/core-backend/src/features/{board,search,report}/`

## 1. 모듈 해부 — 무엇이 어디에

BoardModule 하나에 컨트롤러 11개·서비스 9개가 모여 있습니다. 책임 분리:

| 계층 | 파일 | 책임 |
|---|---|---|
| Controller | `board`, `post`, `comment`, `category`, `emoji`, `post-reaction`, `user-posts`, `user-comments` + `*-admin` 3종 | 라우팅, 권한 데코레이터, DTO 바인딩 |
| Service | `board`, `post`, `comment`, `reaction`, `category`, `emoji`, `board-permission`, `content-purge` | 도메인 규칙, 트랜잭션 조율, 알림 이벤트 발행 |
| Repository | `*.query.ts` / `*.command.ts` 순수 함수 | Prisma 호출 (읽기는 `deletedAt: null` 필터) |

레포지토리 함수가 `PrismaClient | Prisma.TransactionClient`를 받으므로, 서비스가 트랜잭션 안에서 같은 함수를 재사용할 수 있습니다.

## 2. 키셋 페이지네이션 — 목록 조회의 표준

게시글 목록은 `libs/pagination`의 **keyset** 방식을 씁니다. 동작 원리:

1. **커서 = 정렬 필드 값의 스냅샷.** `{ createdAt, id }` 같은 payload를 `base64url(JSON)`로 인코딩합니다 (`libs/pagination/src/cursor/cursor.utils.ts`). 커서만으로 다음 페이지 위치를 알 수 있어 DB 재조회가 없습니다.
2. **`buildKeysetWhere`** (`libs/pagination/src/keyset/keyset.builder.ts`) — 다중 정렬 필드에 대해 사전식 비교 OR 조건을 생성합니다. 예: `(createdAt < c) OR (createdAt = c AND id > i)`.
3. **`limit + 1`개를 가져와** 초과분 존재 여부로 `hasNextPage`를 판정하고, 마지막 항목에서 `nextCursor`를 만듭니다 (`keyset-pagination.service.ts`).
4. **프리셋** (`keyset.presets.ts`) — 정렬 조합은 자유 문자열이 아니라 등록된 프리셋만 허용됩니다: `created-at`(createdAt desc, id asc), `view-count`(viewCount desc, id asc). DTO가 `@IsIn(KEYSET_PRESET_NAMES)`로 검증합니다. **마지막 필드는 반드시 unique tiebreaker(id)** — 같은 값이 여러 개일 때 누락/중복을 막는 안전장치입니다.
5. **인덱스가 프리셋을 뒷받침** — `post_cursor_idx (createdAt DESC, id)`, `post_viewcount_cursor_idx (viewCount DESC, id)` (`board.prisma`). 새 프리셋을 추가하면 대응 인덱스도 함께 추가해야 합니다.

> **알아둘 것**: 저장소에는 페이지네이션 방식이 3가지 공존합니다 — 게시글·댓글은 **keyset**, 검색은 **offset**(page/limit), 신고 목록은 Prisma 네이티브 **cursor**(`cursor: { id }, skip: 1`). 새 도메인 목록 API는 keyset + 프리셋 패턴을 따르는 것이 표준입니다.

## 3. 고정 게시글 — 쿼리 분리 패턴

고정글을 일반 목록에 섞지 않고 **두 쿼리로 분리해 별도 필드로 반환**합니다 (`post.service.ts`의 `findPostsByBoardIdWithKeyset`):

1. `FindPinnedPostsQuery` — `isPinned: true`만, `priority desc → createdAt desc` 정렬, 페이지네이션 없음
2. keyset 목록 쿼리 — `isPinned: false` 조건으로 고정글 제외
3. 응답: `{ ...paginated, pinnedPosts }` — 프론트가 상단에 따로 렌더링

고정글이 커서 계산을 오염시키지 않게 하는 패턴입니다. "일부 항목을 항상 상단에" 요구가 있는 다른 도메인에도 그대로 적용할 수 있습니다.

## 4. 대댓글 — 인접 리스트 + 메모리 트리 조립

- **모델**: `Comment.parentId` 자기참조(인접 리스트)뿐입니다. depth/path 컬럼 없음. **백엔드에는 깊이 제한이 없습니다** — 부모의 존재·미삭제·동일 게시글 여부만 검증합니다 (`comment.service.ts`).
- **UI의 실질 제한**: 프론트 `comment-list.tsx`는 `depth === 0`(루트 댓글)에만 "답글" 버튼을 노출하므로, 실사용 깊이는 댓글→답글 2단계입니다. 더 깊은 트리도 데이터로는 유효하며 렌더링(들여쓰기)은 재귀적으로 동작합니다.

조회는 두 경로:

| 경로 | 방식 | 사용처 |
|---|---|---|
| 전체 조회 | 평면으로 전부 읽고(`createdAt asc`) → `buildCommentTree`로 메모리 조립 | 소규모 |
| 무한스크롤 | ① 루트만(`parentId: null`) keyset 페이지네이션 → ② 자손 전체를 1쿼리로 → ③ 트리 조립 | 게시글 상세 |

`buildCommentTree`(`comment-tree.builder.ts`)는 Map 기반이며, 부모가 가시 영역에 없는 댓글은 **고아로 skip**합니다. 삭제·숨김 댓글은 조회 쿼리에서 아예 필터링되므로(placeholder 없음) 그 자식들도 트리에서 함께 사라집니다 — "삭제됨" 표시가 필요한 도메인이라면 이 정책부터 바꿔야 합니다.

## 5. 리액션 — unique 제약 + raw 집계

- 모델: `Emoji` 마스터(시드로 6종) + `PostReaction` 조인. `@@unique([postId, userId, emojiId])`.
- **토글이 아닙니다** — 추가(POST)와 취소(DELETE)가 별개 엔드포인트입니다 (`post-reaction.controller.ts`).
- 추가 시: 이모지 활성 확인 → 사용자당 개수 제한(SystemSetting `REACTION_MAX_PER_USER_PER_POST`, 기본 1) → create. **중복은 사전 조회가 아니라 DB unique 위반(P2002) catch로 처리** — 경쟁 조건에 안전한 패턴입니다 (`reaction.service.ts`).
- 집계 조회는 `$queryRaw` 한 방: JOIN + GROUP BY로 이모지별 `COUNT` + `BOOL_OR(userId = ?)`(내가 눌렀는지)를 동시에 얻습니다. CHARTER §8이 말하는 "raw 쿼리에 식별자 직접 박힘" 의도된 트레이드오프 위치 중 하나입니다.
- 성공 시 게시글 작성자에게 `REACTION` 알림 이벤트 발행 → [05장](05-notifications.md).

## 6. 검색 — Postgres 풀텍스트 2단계 조회

`features/search/`는 PostgreSQL 풀텍스트 검색입니다 (`to_tsvector('simple', ...) @@ to_tsquery(...)`):

1. **새니타이즈** — `sanitizeSearchQuery`가 tsquery 특수문자(`&|!()`)를 제거하고 공백을 `&`(AND)로 조인 (`search.service.ts`)
2. **1단계 (raw)** — ID + rank만 조회. 정렬 `isPinned DESC, priority DESC, rank DESC, viewCount DESC, createdAt DESC`, **offset 페이지네이션**(page/limit)
3. **2단계 (Prisma)** — 그 ID들을 `findMany({ where: { id: { in } } })`로 관계 포함 재조회 + `deletedAt: null` 필터

- 대상: 게시글(title+content, `PUBLISHED`이고 비밀글 아닌 것만), 댓글(content)
- 필터: `boardId`, `type`(posts/comments/all). 작성자·날짜 필터와 키워드 하이라이팅은 **현재 구현에 없습니다**
- 성능은 GIN 표현식 인덱스가 뒷받침 — 스키마가 아니라 마이그레이션 SQL로 관리됩니다 (`20260509060314_add_search_gin_indexes`). **검색 대상 컬럼을 바꾸면 이 인덱스도 함께 바꿔야 합니다**

## 7. 신고·모더레이션 — 다형 대상 + 트랜잭션 제재

신고는 `targetType`(POST/COMMENT/USER/MEDIA) + `targetId` 다형 참조입니다 ([02장 §2.5](02-data-model.md#25-신고-reportprisma)). 컨트롤러 3개의 역할 분담:

- `report.controller` — 사용자의 신고 생성 (엔드포인트는 `POST` 하나뿐 — 본인 신고 조회는 없음. 중복 신고는 409, 자기 자신 신고 방지)
- `report-admin.controller` — 신고 목록/검토 시작/해결/기각 (상태 전이: PENDING → REVIEWING → RESOLVED/DISMISSED)
- `moderation.controller` — 실제 제재 실행

**제재의 핵심 패턴** (`moderation.service.ts`): 각 액션은 트랜잭션으로 **(a) 대상 상태 변경 + (b) 같은 대상의 미처리 신고 일괄 종결**을 묶습니다:

| 액션 | 동작 | 가역성 |
|---|---|---|
| CONTENT_HIDDEN | `hiddenAt` 설정 | unhide 가능 |
| CONTENT_DELETED | `deletedAt` 설정 (게시글이면 자식 댓글·파일까지 소프트삭제 cascade) | 소프트삭제 |
| USER_WARNED | `warningCount` 증가 | — |
| USER_SUSPENDED | `suspendedUntil` 설정 (**기간 null = 영구 정지**) | unsuspend 가능 |
| NO_ACTION | 기각 처리 | — |

(b)는 `ResolveRelatedReportsCommand` — 같은 대상의 PENDING/REVIEWING 신고를 `updateMany`로 한 번에 RESOLVED 처리합니다. 처리·기각 시 신고자에게 SYSTEM 알림이 발행됩니다.

권한 계단(숨김·경고 = Moderator / 삭제·정지 = Operator / 전체 = Admin)은 [04장 §3](04-permissions.md#3-시드-그룹-6종)의 시드 그룹이 만듭니다.

## 8. 소프트삭제의 뒷정리 — ContentPurgeScheduler

소프트삭제가 무한히 쌓이지 않도록 `ContentPurgeScheduler`(`@Cron`, 매시 실행)가 설정된 시각에 `ContentPurgeService.purgeDeletedContent(retentionDays)`를 호출해, 보존 기간이 지난 소프트삭제 게시판/게시글/댓글을 **물리 삭제**합니다. CHARTER §5의 "soft-delete + 명시적 hard-delete" 원칙의 실제 구현입니다.

## 9. 조회수와 방문 통계는 별개

- **게시글 조회수** — `Post.viewCount`. 상세 조회 시 읽기 권한 검증을 통과하면 `post.service.ts`의 `incrementViewCount`가 `IncrementPostViewCountCommand`(`increment: 1`)를 실행
- **방문 통계** — `infrastructure/analytics/`의 `PageView` 로깅(실패해도 요청을 막지 않음) + 월간 집계(`MonthlyAnalyticsReport`). 게시글 조회수와 연결되어 있지 않은 독립 지표입니다

## 새 도메인에 가져갈 패턴 체크리스트

- [ ] 레포지토리 함수 분리 (`*.query.ts` / `*.command.ts`) + 읽기에 `deletedAt: null`
- [ ] 목록 API는 keyset + 프리셋 + 대응 인덱스
- [ ] "항상 상단" 요구는 쿼리 분리 패턴
- [ ] 중복 방지는 `@@unique` + P2002 catch
- [ ] 인스턴스별 접근 제어는 ResourcePermission 래퍼 서비스
- [ ] 상태 변경 + 연관 정리는 트랜잭션으로 묶기
- [ ] 소프트삭제를 도입하면 purge 경로도 함께 설계

## 더 보기

- 이 패턴들의 조립 순서: [10. 새 기능 만들기](10-new-feature.md)
- 데이터 모델: [02. 데이터 모델 §2.2](02-data-model.md#22-게시판-boardprisma--레퍼런스-도메인)
- 게시판 권한: [04. 권한 시스템 §6](04-permissions.md#6-리소스-권한-resourcepermission)
