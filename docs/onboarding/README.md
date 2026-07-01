# weaver2 온보딩 가이드

> weaver2에 **처음 투입된 개발자**를 위한 안내서입니다. README가 *무엇이 있나*(기능·API)를, CHARTER가 *왜 그런가*(설계 의도)를 답한다면, 이 가이드는 **"처음 보는 사람이 따라 읽으며 전체 그림을 잡는 흐름"**을 채웁니다.

## 어떻게 읽나

**1장부터 순서대로** 읽도록 설계됐습니다. 앞 장이 다음 장의 전제를 깔아 주므로, 건너뛰기보다 한 번은 쭉 통독하는 걸 권합니다. 이미 익숙한 부분은 빠르게 넘기되, 각 장 안의 **⚠️ 트러블슈팅 / 🔍 통찰 / 📌 기억할 것** 박스만큼은 놓치지 마세요 — 실제로 막히는 지점을 모아 둔 곳입니다.

> 💡 순수 NestJS·Next.js·Prisma 문법은 이 가이드가 다시 설명하지 않습니다. 그건 각 [공식 문서](https://docs.nestjs.com)가 가장 정확합니다. 이 가이드는 **"weaver2가 그것들을 *어떻게* 쓰는지"**에 집중합니다.

## 목차

| 장 | 제목 | 무엇을 다루나 |
|----|------|--------------|
| 1 | [소개 (Introduction)](01-introduction.md) | weaver2란 무엇인가(보일러플레이트 vs 프레임워크), 핵심 멘탈모델, 기술 스택 |
| 2 | [시작하기 (Getting Started)](02-getting-started.md) | `pnpm init` 한 방 셋업, DB 준비, 서버 실행, 자주 막히는 곳 |
| 3 | [백엔드 핵심 (Backend Fundamentals)](03-backend-fundamentals.md) | 4계층 구조, NestJS 모듈, 요청의 생애(Controller→Service→Repository), CQRS 파일 분리 |
| 4 | [데이터 계층 (Data Layer)](04-data-layer.md) | 도메인별 분리 Prisma 스키마, 마이그레이션, 시드 원칙, keyset 페이지네이션, coreBackrefs |
| 5 | [인증과 권한 (Auth & Permissions)](05-auth-and-permissions.md) | JWT·native OAuth·2FA, PermissionGroup + 와일드카드, secure-by-default |
| 6 | [프론트엔드 (Frontend)](06-frontend.md) | Next.js App Router, feature-slice, ApiClient, 스킨/슬롯 토큰 |
| 7 | [공유 라이브러리 (libs)](07-libs.md) | common·email·pagination·prisma·shared·upload 6개 패키지 |
| 8 | [모듈 레지스트리 (Module Registry)](08-module-registry.md) | 이 브랜치의 본체 — 매니페스트·footprint·pinpoint·그래프·라이프사이클 (한계까지 정직하게) |
| 9 | [실전 가이드 (Recipes)](09-recipes.md) | 새 기능 추가/제거, 권한 추가, 테스트 작성 — 여러 장을 꿰는 실전 |
| 10 | [참고 (Reference)](10-reference.md) | 용어집, 자주 막히는 곳 FAQ, 명령어 모음, 관련 문서 안내 |
| 📚 | [기술 스택 & 학습 로드맵](tech-stack.md) | *(부록)* 엮어둔 프레임워크·라이브러리 인벤토리 + 공식문서 링크 + 무엇을 어떤 순서로 배울지 |

## 빠른 시작

처음이라면 **[1장 소개](01-introduction.md)**부터. 일단 코드를 띄워보고 싶다면 **[2장 시작하기](02-getting-started.md)**로 바로 가도 됩니다.

## 관련 문서

| 문서 | 역할 |
|------|------|
| [`README.md`](../../README.md) | 기능 카탈로그·API·CI 가이드 (레퍼런스) |
| [`CHARTER.md`](../CHARTER.md) | 보일러플레이트 헌장 — 설계 의도·범위·원칙(§5.1 일반화 4렌즈 포함) |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | 브랜치·커밋·PR·리뷰 워크플로우 |
| [`docs/specs/`](../specs/) | module-registry 등 설계 1차 자료 |
