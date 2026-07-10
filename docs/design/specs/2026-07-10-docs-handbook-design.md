# docs/handbook — 개발자 온보딩 핸드북 설계

- **날짜**: 2026-07-10
- **상태**: 승인됨 (설계 승인 후 작성 진행)
- **주 독자**: 사람 개발자 온보딩 (새로 합류하는 동료가 코드를 열기 전에 읽는 문서)
- **범위**: 풀 핸드북 (11개 문서)

## 1. 목적

weaver2를 처음 접하는 개발자가 **시스템 내부 동작을 이해하고 새 작업을 시작**할 수 있게 하는
공식문서 퀄리티의 온보딩 핸드북을 `docs/handbook/`에 작성한다.

## 2. 기존 문서와의 역할 분담 (중복 방지)

| 층 | 담당 | 핸드북과의 관계 |
|---|---|---|
| `README.md` | 소개·설치·기능 카탈로그·API 목록 | 핸드북은 설치법을 반복하지 않고 링크만 한다 |
| `CHARTER.md` | 정체성·범위·설계 원칙(왜) | 핸드북은 "왜"를 재인용하고 **"어떻게 동작하는가"**를 담당 |
| `.agents/skills/` | AI용 코딩 규칙 (압축) | 핸드북은 사람용 서사·다이어그램·코드 추적 담당 |
| **`docs/handbook/`** | **코드 내부 동작 해설** | ← 이번에 만드는 것 |

핸드북의 정체성 = **"코드를 열기 전에 읽는, 시스템 내부 동작의 공식 해설서"**.

## 3. 문서 구성

```
docs/handbook/
├── README.md              # 핸드북 인덱스 + 추천 읽기 순서
├── 00-overview.md         # 시스템 전체 지도 — 모노레포 구조, 요청 수명주기, 아키텍처 다이어그램
├── 01-backend.md          # NestJS 모듈 구조(core/features/infrastructure/system), CQRS 레포지토리 패턴, libs/ 역할
├── 02-data-model.md       # Prisma 도메인별 스키마 지도, ERD(mermaid), soft-delete 정책, FK 네이밍, 마이그레이션 흐름
├── 03-auth.md             # JWT 쿠키 수명주기, refresh 회전, 계정 잠금, 2FA 분기, OAuth 3종, 세션 관리
├── 04-permissions.md      # PermissionGroup 모델, 가드 동작 순서, 와일드카드 매칭, 캐시, 백·프론트 공유
├── 05-notifications.md    # EventEmitter2 → Listener → DB/SSE/WebPush 파이프라인, NOTIFICATION_EMITTER 확장 포인트
├── 06-uploads.md          # StorageProvider 추상화, Local/S3, 썸네일, 파일 서빙(302)
├── 07-board-reference.md  # 레퍼런스 도메인 해부 — 게시판·대댓글·리액션·검색·신고, 키셋 페이지네이션
├── 08-frontend.md         # App Router 라우팅 지도, features 슬라이스, ApiClient, SkinProvider, URL 상태 관리
├── 09-testing.md          # 유닛/통합/e2e 3층 구조, 실행법, 테스트 픽스처(시드 계정)
└── 10-new-feature.md      # 새 기능 얹는 워크스루 — weaver-crud-recipe의 사람용 해설 + 체크리스트
```

## 4. 작성 원칙 — "공식문서 퀄리티"의 정의

1. **사실 정확성**: 추측 금지. 각 챕터는 해당 도메인 코드를 실제로 읽고 검증하며 작성한다.
   README/CHARTER에서 재인용하는 내용도 코드와 대조한다.
2. **다이어그램**: mermaid (시퀀스/플로우/ERD) — GitHub에서 바로 렌더링.
3. **코드 앵커**: 설명마다 실제 파일 경로를 명시해 코드로 점프 가능하게 한다.
   줄 번호처럼 쉽게 낡는 앵커는 피하고 파일 경로·심볼 수준으로만.
4. **각 챕터 말미 "더 보기"**: 관련 스킬·CHARTER 섹션·코드 진입점 링크.
5. **한국어**, 기존 문서 톤 유지.

## 5. 후속 정리

- `CHARTER.md` §7.3 docs 구조에 `handbook/` 등록
- `README.md` 문서 구조 표에 핸드북 추가

## 6. 진행 방식

- 도메인별 코드 조사(병렬 서브에이전트) → 본문 작성 → 챕터 단위 검증
- 문서량이 크므로 챕터별/묶음별로 나눠 커밋
