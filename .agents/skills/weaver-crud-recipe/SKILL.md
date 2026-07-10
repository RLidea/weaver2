---
name: weaver-crud-recipe
description: Recipe for assembling a new record-CRUD entity (backend API + admin/public screens) in weaver2 by mirroring the Board core pattern. Apply when adding a new entity, table, or CRUD feature — e.g. "새 엔티티", "테이블 추가", "CRUD 추가", "도메인 추가".
license: UNLICENSED
metadata:
  author: Weaver2 Team
  version: "0.1.0"
  project: weaver2
---

# Weaver CRUD Recipe — 새 엔티티 얹기 (골격 v0.1)

weaver2에 새 레코드 엔티티의 **표준 CRUD 세트**를 조립하는 레시피.

> **v0.1 = 골격.** 표준 세트 정의 + 미러링 포인터 + 경계선만 담는다.
> 단계별 상세 가이드(`references/`)는 **첫 실전 fork에서 실제로 엔티티를 얹으며** 그 경험으로 채운다
> (CHARTER §5.1 — 증거 기반, pull-not-push). 설계 배경: `docs/superpowers/specs/2026-07-10-weaver2-crud-recipe-design.md`

## ⚠️ 신선도 점검 (이 스킬을 쓰기 전에, 매번)

아래 포인터가 현재 코드와 일치하는지 먼저 확인한다. 어긋난 포인터를 발견하면 **이 문서를 먼저 고치고** 작업을 진행한다.
매 fork·매 사용이 이 레시피의 회귀 테스트다.

## 표준 CRUD 세트 (슬림 코어) — 엔티티당

**백엔드** (`apps/core-backend/src/features/<entity>/`):
- CRUD 5종 API — 목록·단건 조회·생성·수정·삭제(soft-delete)
- CQRS 파일 분리 — `controllers/` + `services/` + `repositories/`(`*.query.ts` / `*.command.ts`) + `dto/`
- `PERMISSIONS` 상수 추가 + 가드 적용, permission-group 시드 매핑
- prisma 모델 — FK 컬럼명 `{참조테이블명}Id`, `deletedAt`(soft-delete) + `createdAt`/`updatedAt`(audit), `@@map("snake_plural")`
- 서비스 유닛 테스트 (`*.service.spec.ts` 패턴)

**프론트 — 관리자 (골격 표준)**: `/admin/<entities>` 목록(테이블+필터·정렬) / 생성 / 상세·수정.
목록·모달 골격은 높은 표준화가 가능하지만, **폼 필드는 타입별(관계 선택·enum·리치텍스트 등) 케이스별 구현**이 필요하다 — "완전 자동"을 약속하지 않는다.

**프론트 — 공개 (기본형)**: `/<entities>` 목록, `/<entities>/[id]` 상세. 도메인 다듬기는 이 기본형 위에서.

**옵션 add-on (필요한 엔티티만)**: 첨부파일 · 풀텍스트 검색 · 알림 연동. 기본 포함하지 않는다.

## 미러링 포인터 — Board 엔티티가 미니멀 본보기

**Board**(name/description + soft-delete/audit)가 가장 단순한 레코드 CRUD 예시다. Post는 확장형(keyset 목록·카테고리·첨부) 참고용.

| 단계 | 미러링할 파일 | 참고 심볼/비고 |
|------|--------------|----------------|
| prisma 모델 | `apps/core-backend/prisma/schema/board.prisma` | `model Board` — `deletedAt`/`createdAt`/`updatedAt`, `@@map("boards")` |
| 권한 상수 | `libs/shared/src/index.ts` | `PERMISSIONS.BOARD` 블록 + 하단 union 타입에 추가 |
| 권한 시드 | `apps/core-backend/prisma/seed/permission-group.seed.ts` | 시드 원칙은 CHARTER §7.1 (자연키 멱등) |
| 컨트롤러 | `features/board/controllers/board.controller.ts` | `createBoard`/`findAllBoards`/`findBoardById`/`updateBoard`/`deleteBoard` — 노출은 `@Public` 명시 (secure-by-default) |
| 서비스 | `features/board/services/board.service.ts` | |
| 쿼리/커맨드 | `features/board/repositories/find-all-boards.query.ts` · `find-board-by-id.query.ts` · `create-board.command.ts` · `update-board.command.ts` · `delete-board.command.ts` | 읽기/쓰기 파일 분리 유지 |
| DTO | `features/board/dto/board.dto.ts` · `create-board.dto.ts` · `update-board.dto.ts` | |
| keyset 목록 | `features/board/dto/board-posts-query.dto.ts` + `libs/pagination/` | 대량 목록이 필요할 때 Post 목록 패턴을 미러링 |
| 유닛 테스트 | `features/board/services/board-permission.service.spec.ts` 등 `services/*.spec.ts` | |
| 관리자 화면 | `apps/core-frontend/src/app/(admin)/admin/boards/page.tsx` + `features/admin/boards/` (board-table, create/edit modal, hooks, query-keys, api) | |
| 공개 목록 | `apps/core-frontend/src/app/(protected)/boards/page.tsx` + `features/board/components/board-list.tsx` | |
| 공개 상세 | `app/(protected)/boards/[id]/posts/[postId]/page.tsx` 패턴 참고 | |
| API 클라이언트 | `features/board/api/board.api.ts` | ApiClient 필수 — `fetch()` 직접 사용 금지 |

## 경계선 — 게시판에서 복제하지 말 것 (커뮤니티 도메인 특수)

다음은 표준 세트가 **아니다** (CHARTER §1 — 게시판은 레퍼런스 예시일 뿐):

- 대댓글 (`comment*`), 리액션·이모지 (`reaction*`, `emoji*`), 고정 게시글 (`find-pinned-posts`), 카테고리 (`category*`), 조회수 (`increment-post-view-count`), 콘텐츠 퍼지 스케줄러 (`content-purge*`), 신고 연동 (`features/report`)

## 관련 스킬 (재선언 금지 — 참조만)

- `weaver-coding-standards` — ApiClient·NestJS 컨벤션·DB 네이밍
- `weaver-ui-patterns` — 테이블·탭 컴포넌트, URL 상태 관리, 스킨 토큰 사용법
- `nestjs-best-practices` — NestJS 일반 베스트 프랙티스
