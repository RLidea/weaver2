# weaver2 재정의: "커뮤니티 플랫폼" → "플랫폼 보일러플레이트"

> **상태**: 설계 승인됨 (2026-07-01) · 구현 계획 대기
> **범위**: 정체성 재정의 + 코어/도메인 경계 명문화 + `abuse-report` 최소 분리
> **관련**: [`CHARTER.md`](../CHARTER.md) · [`module-registry-design`](2026-05-30-module-registry-design.md)

---

## 1. 배경 — 왜 재정의하는가

weaver2는 스스로를 **"커뮤니티 플랫폼 보일러플레이트"**라 부른다(README·CHARTER·온보딩). 그러나 실제 자산의 무게중심은 커뮤니티 특화 기능(게시판·댓글·신고·모더레이션)이 아니라, **어떤 플랫폼에도 필요한 코어**(인증·권한·알림·관리자·업로드·보안·CI)에 있다. 게시판은 그 코어 위에 얹힌 *한 예시*에 가깝다.

"커뮤니티 플랫폼"이라는 도메인 한정은 두 가지 부작용을 낳는다:

1. **게시판이 "본질"로 못 박혀** 떼어낼 이유가 사라진다 — 그런데 SaaS 대시보드·마켓플레이스·내부 툴처럼 게시판이 없는 플랫폼이 얼마든지 있다.
2. **module-registry(간판 기능)의 존재 이유가 약해진다** — "기능을 통째로 떼어낸다"는 도구는, 뗄 수 있는 도메인이 정체성에 명시돼야 정당해진다. CHARTER §8이 지적한 *"banner 1례뿐인 PoC"* 문제의 뿌리가 여기 있다.

## 2. 결정 — 정체성 재정의

| | Before | After |
|---|---|---|
| 정체성 | 커뮤니티 **플랫폼** 보일러플레이트 | **플랫폼** 보일러플레이트 |
| 게시판의 위상 | 본질 (항상 포함) | **도메인 예시** (갈아끼움) |
| module-registry | banner 전용 PoC | 코어/도메인 경계를 지탱하는 **간판** |

weaver2 = **"어떤 플랫폼에도 필요한 코어" + "갈아끼우는 도메인 모듈"**의 조합. 커뮤니티는 그 도메인의 첫 실증 예시일 뿐이다.

## 3. 판별 리트머스 (단일 기준)

> **"커뮤니티든 SaaS 대시보드든 마켓플레이스든 내부 툴이든, 어떤 플랫폼에도 필요한가?"**
> → 예면 **🟢 코어**, 특정 도메인에만 필요하면 **🔴 도메인 모듈**.

기준은 **개념적 필요성** 하나다(기술적 착탈성이 아니라). 착탈성은 module-registry가 뒤따라 강제할 구현 목표이지, 경계를 *가르는* 기준이 아니다. CHARTER §5.1의 "증거 기반 일반화"와 같은 결 — 도메인은 *실제로 필요 없어질 수 있는* 것들이다.

## 4. 경계 지도

### 🟢 코어 — 항상 남음

- `auth` · `user` · `permission`
- `notification` · `email` · `upload` · `config`
- `system(admin)` · `terms(약관)`
- **신고 접수·검토 인프라 + 유저 제재**(경고·정지·차단) — §5 참조

### 🔴 도메인 모듈 — 통째로 착탈

- **`community` 번들** = `board` + `search` + `reaction` + **콘텐츠 대상 조치**(hide/delete)
- **`banner`** = 이미 검증된 독립 1례

### 🔧 module-registry — 경계를 지탱하는 간판

도메인 착탈을 매니페스트(`*.feature.ts`)로 추적·강제한다. `community`를 "두 번째 모듈"로 실증하면 CHARTER §8의 *"banner 전용 PoC"* 딱지를 제거할 수 있다. **단 이 실증은 본 설계의 범위 밖**(§7).

### 핵심 설계 통찰 — seam(확장 지점)

코어 중 `notification`·`system(admin)`·`permission`은 **순수하게 코어가 아니라, 도메인이 훅을 꽂는 확장 지점**이다:

- 게시판이 "댓글 알림"을 `notification`에 등록
- "콘텐츠 관리 화면"을 `admin`에 등록
- `board:*` 권한을 `permission`에 등록

따라서 진짜 일은 "폴더를 코어/도메인으로 나누기"가 아니라, **도메인이 코어에 꽂는 훅들을 매니페스트로 추적해서, 도메인을 뗄 때 그 훅들도 함께 빠지게 만드는 것**이다. 이것이 module-registry의 본질적 역할이다.

## 5. `abuse-report` 분리 설계 (실측 기반)

### 5.1 현재 구조 (실측)

- 실제 모듈명은 `report`가 아니라 **`abuse-report`** (`apps/core-backend/src/features/abuse-report/`).
- 이미 두 서비스로 나뉨: `AbuseReportService`(신고 레코드 CRUD) / `ModerationService`(실제 조치).
- 진짜 결합은 **서비스 경계가 아니라 공유 DB 모델 + 커맨드 직접 호출**에 있다:
  - `ModerationService` 하나가 **board 커맨드**(`HidePost`/`DeletePost`/`HideComment`/`HidePostFile`)와 **user 커맨드**(`WarnUser`/`SuspendUser`/`UnsuspendUser`)를 둘 다 직접 import·호출.
  - `AbuseReport` 모델이 **다형**(target: POST·COMMENT·**USER**·MEDIA) — 유저 신고까지 한 모델에.
  - 유저 제재 경로가 끝에 `ResolveRelatedAbuseReportsCommand`로 신고 레코드를 갱신 → B가 A에 결합.
  - `reporter`/`resolvedBy` FK → `User`(코어).
  - 유저 제재 *상태*(`User.warningCount`·`User.suspendedUntil`)와 커맨드는 **이미 `core/user`에 존재**.
- 프론트: 신고 처리 UI는 전부 `admin` 화면에만 있음. board 화면 쪽 신고 버튼은 미연결(백엔드 접수 API만 존재).

### 5.2 경계 판정 — 신고 인프라는 코어다

리트머스 적용: *"콘텐츠 없는 SaaS 대시보드에서도 유저를 신고·제재할 수 있어야 하나?"* → **예**. 따라서 **신고 접수 인프라 자체가 코어**다. 콘텐츠 신고 전체를 community 번들로 넣으면 유저 신고가 갈 곳을 잃는다.

| | 코어 🟢 | community 도메인 🔴 |
|---|---|---|
| 신고 접수·검토·resolve 인프라 | ✅ | |
| 유저 제재(경고·정지·차단) | ✅ (이미 `core/user`) | |
| USER 대상 신고 | ✅ | |
| **콘텐츠 대상 조치**(post/comment/media hide·delete) | | ✅ |

즉 community 번들에 들어가는 건 "신고 기능"이 아니라 **"콘텐츠를 숨기고 지우는 조치"**뿐이다. 신고라는 *메커니즘*은 도메인 무관이라 코어에 남는다.

### 5.3 분리 작업 (승인된 깊이: ModerationService 분리까지 = 1+2)

1. `ModerationService`/`moderation.controller`를 대상별로 분리:
   - **`ContentModerationService`** — 콘텐츠 조치(board 커맨드 의존). 도메인.
   - **`UserModerationService`** — 유저 제재(이미 `core/user` 커맨드 보유). 코어.
2. `AbuseReport` 모델·접수·검토는 **코어 유지**.
3. *(범위 밖·더 깊게)* `ResolveRelatedAbuseReportsCommand`를 이벤트로 역전 → 제재(B)가 신고 스키마(A)를 직접 안 건드리게. **본 설계에서는 하지 않음.**

**되돌리는 비용이 큰 것은 미룬다**(CHARTER §5.1 렌즈 3): `AbuseReport` 모델·`resolve` 결합·DB 스키마는 손대지 않는다.

## 6. 문서 변경점

"커뮤니티 플랫폼"이라는 표현은 코드가 아니라 문서 세 곳에 박혀 있다:

| 문서 | 변경 |
|------|------|
| `docs/CHARTER.md` §1 Mission | "커뮤니티 플랫폼 보일러플레이트" → "**플랫폼 보일러플레이트**"; 게시판을 도메인 예시로 리프레이밍 |
| `docs/CHARTER.md` §3 IN-SCOPE | 기능 나열을 **🟢코어 / 🔴도메인 모듈** 두 구획으로 재편 |
| `docs/CHARTER.md` §5 원칙 | **판별 리트머스**(개념적 필요성) 원칙 1줄 추가 |
| `docs/CHARTER.md` §8 한계 | module-registry 서술 → *"코어/도메인 경계의 간판, community가 두 번째 모듈 후보"*로 갱신 |
| `README.md` 3번째 줄 | "커뮤니티 플랫폼 보일러플레이트" → "**플랫폼 보일러플레이트**" |
| `docs/onboarding/01-introduction.md` §1.1 | 정체성 문장 동일 교정 |

> **정직 원칙**: 문서에 "유저 제재는 코어"라고 쓰면서 코드에선 `abuse-report` 도메인에 방치하면 그 문서가 거짓말이 된다. §5의 코드 분리는 개념-코드 불일치를 제거하기 위한 최소선이다.

## 7. 범위 밖 (이번 작업에 포함하지 않음)

- **community 실제 착탈 검증** — module-registry로 community 번들을 통째로 떼어 코어가 부팅되는지 실증하는 것. CHARTER §8 PoC 딱지 제거의 진짜 답이지만, 별도 큰 작업 → 로드맵으로.
- **`AbuseReport` 모델 재설계 / resolve 결합 역전** — §5.3-3. 되돌리는 비용이 커 미룸.
- **DB 스키마 변경 / 마이그레이션** — 없음.
- **community 번들의 매니페스트(`*.feature.ts`) 신규 작성** — 실증 단계에서.

## 8. 구현 단계 개요 (writing-plans에서 상세화)

1. **문서 재정의** — CHARTER §1·§3·§5·§8, README, 온보딩 01 (§6).
2. **코드 분리** — `ModerationService`/`moderation.controller`를 Content(도메인)/User(코어)로 분리 (§5.3-1,2). 기존 엔드포인트 동작·권한 보존.
3. **검증** — 유닛/통합 테스트 통과, 신고→콘텐츠 조치·신고→유저 제재 두 경로 회귀 확인.

---

## 부록 — 결정 로그

| 결정 | 값 | 근거 |
|------|-----|------|
| 변화 깊이 | 코어 vs 도메인 경계 명확화 | 포지셔닝만/전면분리 사이의 실용적 중간 |
| 판별 리트머스 | 개념적 필요성 | 설계를 먼저 이끎; 착탈성은 뒤따르는 구현 목표 |
| 도메인 입도 | 커뮤니티 번들 하나 | board·search·reaction·콘텐츠조치가 종속으로 얽힘 |
| 산출물 범위 | 문서 + report 최소 분리 | 정직 원칙 — 개념-코드 불일치 제거 |
| abuse-report 분리 깊이 | ModerationService 분리까지 | resolve 결합·모델은 되돌림 비용 커 미룸 |
