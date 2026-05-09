# Weaver2 종합 진단 보고서

**일자**: 2026-05-09
**범위**: 5개 영역 병렬 감사 (보안·아키텍처·테스트·DB/성능·프론트엔드)
**규모**: TS 25,300줄 / 490 파일 / pnpm 모노레포

> **📌 진행 상태 (2026-05-09 마감)**: 본 보고서의 모든 P0·P1·P2 항목 처리 완료.
> 향후 권장 작업은 [`ROADMAP.md`](../../ROADMAP.md)로 분리.
>
> - 총 **39개 커밋**으로 처리 (boilerplate 강화)
> - 테스트: **49 → 102개** (+53개)
> - CI: GitHub Actions 4종 워크플로우 + Branch ruleset 활성화
> - 보안: 12 CVE 패치, IDOR/CSRF/OAuth/IDOR 차단, csurf → csrf-csrf 마이그레이션
> - 항목별 처리 매핑은 본 문서 끝의 [📋 처리 매핑](#-처리-매핑) 참조

---

## 🚨 P0 — 즉시 수정 권장 (보안/무결성/장애)

| # | 영역 | 위치 | 문제 | 영향 |
|---|------|------|------|------|
| 1 | 프론트 | `apps/core-frontend/src/proxy.ts` | Next.js 미들웨어 규약 위반(`middleware.ts`가 정답). `.next/server/middleware-manifest.json`이 비어있음 | **미들웨어 전혀 미동작** — 보호 경로 리디렉트 부재. `/admin` 패턴도 누락 |
| 2 | 보안 | `libs/common/src/global/middleware/security.middleware.ts:58` | `origin.includes(process.env.ORIGIN_URL \|\| '')` — env 미설정 시 `''.includes('')===true`로 모든 origin 통과 | **CSRF 보호 무력화** (prod env 누락 시) |
| 3 | 보안 | `apps/core-backend/src/features/board/services/board-permission.service.ts:41-58, 64-85` | 비로그인 분기에서 `authorId === user.id` 검사 없이 `EDIT_OWN`/`DELETE_OWN`만 체크. 기본 보드는 `allowAnonymous: true` 등록 | **익명 사용자가 타인 게시글 수정·삭제 가능** (IDOR) |
| 4 | DB | search.service.ts:75-95, 161-178 | `to_tsvector(...)` 즉석 계산 + GIN 인덱스 부재 | 게시글 늘면 검색 응답 시간 폭증 (순차 스캔) |
| 5 | DB | search.service.ts:14-16, 94, 176 | offset 페이지네이션 잔존 (`OFFSET ${skip}`) | 깊은 페이지에서 비용 폭발, keyset 기조와 불일치 |
| 6 | DB | moderation.service.ts:22-29, 45-55, 70-77, 96-106, 119-126, 150-161, 179-190 | 콘텐츠 update + ResolveRelatedReportsCommand 트랜잭션 미적용 | 첫 쓰기만 성공 시 신고-콘텐츠 상태 불일치 |
| 7 | 백엔드 | post.service.ts:223-232 | Post soft-delete 시 자식(comments/reactions/files) 미정리 | orphan + soft-delete 누수 |
| 8 | 아키 | features/report/services/moderation.service.ts:16-197 | Post/Comment/User 등 다른 도메인 테이블을 PrismaService 직접 mutate | 도메인 캡슐화 우회 — 향후 무결성 규칙 추가 어려움 |

> ⚠️ **false positive로 판정 (감사 후 검증)**: "admin 컨트롤러 가드 누락" 은 부정확합니다. `auth.module.ts:52-58`에서 `APP_GUARD`로 `JwtAuthGuard`+`PermissionGuard`가 글로벌 등록되어 있어 명시적 `@UseGuards`가 없어도 동작합니다. 다만 `@Public()` 적용 위치는 별도 점검 필요 (P1 참고).

---

## ⚠️ P1 — 가까운 시일 내 수정

### 보안
- **변이 엔드포인트의 `@Public()` 잔존** — `post.controller.ts:42-43,148-149,165-166`, `comment.controller.ts:40-41,124-125,151-152`. 익명 게시 허용 의도라면 OK이나 IDOR(P0 #3)와 결합 시 위험.
- **세션 컨트롤러 가드 누락** — `session.controller.ts:18,21`에 `@UseGuards(JwtAuthGuard)` 명시 없음 (글로벌 가드로 동작은 하나 명시성 부족).
- **이메일 변경 throttle 누락** — `user-profile.controller.ts:110,126` 무차별 시도 가능.
- **댓글 children 1단계 hidden 필터 누락** — `find-all-comments-by-post-id.query.ts:10` (2~4단계는 적용됨).
- **OAuth 동일 이메일 자동 연동** — `oauth.service.ts:160-172` 계정 탈취 가능성 (이메일 미검증 provider 한정).

### DB·성능
- **인덱스 누락**: `Post.authorId`, `Comment.authorId`, `RefreshToken.userId`, `Post.categoryId`
- **Comment 4단계 children 하드코딩 include** — 깊은 스레드에서 메모리/응답 부담
- **Reaction 1회 조회에 6+ 쿼리** — addReaction/removeReaction 후 매번 getReactions 재호출

### 테스트 (P0 우선 작성)
- `sign-in.service.ts` — 계정 잠금/정지/탈퇴 분기 (auth fix 22건 집중)
- `reset-password.service.ts` — 만료 토큰/세션 무효화 체인
- `board-permission.service.ts` — canEdit/canDelete 비로그인/owner/non-owner 3분기 (IDOR P0 회귀 방지)
- `moderation.service.ts` — 자동 신고 처리, soft-deleted 대상, 정지 해제

### 아키텍처
- **CQRS 부분 적용** — board(post/comment/reaction/category) 서비스에서 prisma 직접 호출 다수, repositories/는 12개만 분리
- **search 모듈에 repositories/ 부재** — Post/Comment 직접 raw query → board 책임 누수
- **PrismaModule 등록 패턴 혼재** — core.module.ts에 등록되어 있는데 하위 모듈에서 재선언

### 프론트엔드
- **에러 토스트 누락** — `features/admin/`의 mutation 13곳에서 `onError` 미지정 (실패 시 사용자 무반응). `email-template-list`만 적용됨
- **테이블 8개 인라인 중복** — `<table className="w-full text-sm">` 패턴 반복. `DataTable<T>` 신설 필요
- **Pagination 컴포넌트 미적용** — content-posts/comments 탭은 인라인 버튼 구현
- **세분 권한 게이트 부족** — `(admin)/layout.tsx`의 `ADMIN.ACCESS` 한 번만 체크. 하위 페이지는 액션별 `hasPermission` 호출 없음
- **`<img>` 원시 사용** — `user-table.tsx:93-97` (next/image로 교체)

---

## 🔧 P2 — 정리 후보

- **csurf@1.11 deprecated (2022~)** — `@nestjs/csrf` 등 대체 검토
- **`useStaticAssets`로 src/assets 노출** — `main.ts:30-32` 의도치 않은 파일 유출 가능성
- **api-client.ts 운영 console.log 6+** — 디버그 플래그/로거 게이트
- **`confirm()` 브라우저 다이얼로그 잔존** — `comment-list.tsx:69`, `post-detail.tsx:164`, `oauth-connections.tsx:40`
- **report.command.ts `as never` 캐스팅** — 타입 안전성 손실
- **JSON 컬럼 다수** (system.prisma) — 향후 검색·집계 한계
- **search → board DTO 직접 의존** — ViewDto 분리 검토
- **권한 그룹 `@Global()` 비대칭** — PermissionModule만 글로벌, SystemSettingModule은 imports 패턴

---

## ✅ 잘 설계된 부분

- **`forwardRef` 0건** — 순환 의존 없음, 모듈 토폴로지 단방향(`features → core → infrastructure`)
- **CQRS 패턴 정착 (core 도메인)** — auth 57+, user 다수의 query/command 분리
- **Keyset 페이지네이션** — `Post`의 `post_cursor_idx`, `post_viewcount_cursor_idx` 잘 설계됨
- **soft-delete + CASCADE 함정 회피** — `DeleteAccountService`의 `$transaction` + 명시 hard-delete
- **ApiClient 사용 규율** — features 어디에도 직접 `fetch`/`axios` 없음
- **queryKey 중앙화** — 도메인별 `*Keys` 객체로 캐시 일관성
- **글래스모피즘 토큰화** — `card.tsx:13`, `modal.tsx:58`로 한정, 일탈 적음
- **OAuth state cookie 검증** — `oauth.service.ts:55` CSRF 차단
- **RefreshToken IDOR 방어** — `where: { id, userId }` 일관 적용
- **Report/Moderation 컨트롤러 권한 일관** — `@RequirePermission` 잘 적용

---

## 📊 권장 액션 플랜

### 1주차 (긴급)
1. `proxy.ts` → `middleware.ts` 이름 변경 + `/admin` 추가 (P0 #1)
2. CSRF 빈 문자열 체크 추가 (P0 #2)
3. `board-permission.service.ts` 비로그인 분기 거부 (P0 #3)
4. `board-permission.service.ts` 회귀 방지 unit test 작성

### 2주차 (성능·무결성)
5. Search GIN 인덱스 마이그레이션 (P0 #4)
6. Search keyset 페이지네이션 전환 (P0 #5)
7. moderation 서비스 `$transaction` 적용 (P0 #6)
8. Post soft-delete 시 자식 정리 트랜잭션 (P0 #7)

### 3주차 (테스트·일관성)
9. P0~P1 테스트 5종 작성 (Quick Wins)
10. P1 인덱스 4종 추가
11. 프론트 `useMutationWithToast` 표준화

### 추후
12. 아키텍처 — moderation cross-domain 리팩토링, search repo 분리, CQRS 일관화
13. csurf 마이그레이션
14. 프론트 DataTable·Tabs 공통 컴포넌트화

---

## 📝 산출물 위치

- 본 보고서: `.omc/research/weaver2-audit-2026-05-09.md`
- 영역별 원본 분석: 5개 에이전트 출력 (transcript 참조)
- 향후 권장 작업: [`ROADMAP.md`](../../ROADMAP.md)

---

## 📋 처리 매핑

본 보고서가 발견한 모든 항목과 그 처리 커밋의 매핑입니다.

### P0 (즉시 수정) — ✅ 모두 완료

| # | 항목 | 처리 커밋 |
|---|------|----------|
| 0 | React/Next.js 12 CVE 패치 | `37e39d0` |
| 1 | proxy.ts 보호 경로 누락 | `ec3932b` |
| 2 | CSRF `ORIGIN_URL` 빈 문자열 우회 | `1329b4a` |
| 3 | board-permission 익명 IDOR | `536eb6e` |
| 4 | Search GIN 인덱스 부재 | `8cd11ec` |
| 5 | Search OFFSET 폭증 | `52f0a4e` (page cap) |
| 6 | moderation 트랜잭션 누락 | `ff29bbb` |
| 7 | Post soft-delete 자식 미정리 | `6f5e093` |
| 8 | moderation cross-domain mutation | `14025a9` |

### P1 (가까운 시일) — ✅ 모두 완료

| 영역 | 항목 | 커밋 |
|------|------|------|
| 보안 | 변이 엔드포인트 `@Public()` 잔존 | `0f76baf` |
| 보안 | 세션 컨트롤러 가드 명시 | `0f76baf` |
| 보안 | 이메일 변경 throttle 누락 | `1ccc0ba` |
| 보안 | 댓글 1단계 children hiddenAt 누락 | `af51413` |
| 보안 | OAuth 동일 이메일 자동 연동 | `0111c59` |
| DB | 인덱스 4종 (Post.authorId/categoryId, Comment.authorId, RefreshToken.userId) | `62f3a2a` |
| DB | Comment 4단계 nested → 평면 조회 | `bd020ef` |
| DB | Reaction 6+ 쿼리 → 단일 JOIN | `9c6cae0` |
| 테스트 | 회귀 방지 (IDOR/moderation/reset-password) | `a573236` |
| 테스트 | sign-in/2FA/report/notification/search | `2b66e73` |
| 아키 | search/repositories 분리 | `104f35e` |
| 아키 | board CQRS 통일 | `07aa5af` |
| 아키 | @Global() 비대칭 정리 | `379c73b` |
| 프론트 | mutation 글로벌 토스트 + next/image | `f570a03` |
| 프론트 | DataTable 공통 컴포넌트 | `477921a` |
| 프론트 | Pagination 통일 | `082ed8c` |
| 프론트 | Tabs 공통 컴포넌트 | `476f0aa` |
| 프론트 | confirm() → ConfirmDialog | `215d9c2` |
| 프론트 | admin 세분 권한 게이트 (RequirePermission) | `6217076` |

### P2 (정리 후보) — ✅ 모두 완료

| 항목 | 커밋 |
|------|------|
| api-client.ts 디버그 로그 정리 | `4ab2ced` |
| storybook 타입 누락 (tsc exclude) | `4ab2ced` |
| useStaticAssets 보안 강화 (dotfile/index 차단) | `8589332` |
| csurf@1.11 deprecated → csrf-csrf | `75a063a` |
| Report 리포지토리 `as never` 제거 | `f75b9fa` |
| system.prisma JSON 정책 주석화 | `5f64b9b` |

### 발견 후 false-positive로 판정 (감사 후 검증)

- "admin 컨트롤러 가드 누락" → `auth.module.ts:52-58`에서 `APP_GUARD`로 글로벌 등록되어 있어 명시적 `@UseGuards` 없이도 동작
- "proxy.ts → middleware.ts 변경 필요" → Next.js 16.2부터 `proxy.ts`가 신규 표준 (감사가 16.1.6 시점에 진행되어 오진단)

### 보너스 (감사 외 처리)

| 항목 | 커밋 |
|------|------|
| ToastProvider provider 순서 fix | `bf464ec` |
| GitHub Actions CI 4종 + 보조 파일 | `50a5470`, `6e10a50`, `4571cd3` |
| CI 실패 보정 (3차) | `c905932`, `3b79ec9`, `24fb37e` |
| Push graceful disable (VAPID 키 누락 시) | `24fb37e` |
