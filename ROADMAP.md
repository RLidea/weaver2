# Weaver2 Roadmap

`weaver2`는 NestJS + Next.js 보일러플레이트로서 핵심 보안·성능·아키텍처는 이미
[`docs/audits/weaver2-audit-2026-05-09.md`](docs/audits/weaver2-audit-2026-05-09.md)
의 P0~P2 항목을 모두 처리한 상태입니다 (2026-05-09 기준).

본 문서는 **그 다음 단계**, 즉 외주/실제 서비스로 띄울 때 추가하면 좋은
권장 작업을 담고 있습니다.

---

## 🟢 우선순위 높음 (외주 시작 전 권장)

### Dependabot 활성화

- 위치: `Settings → Code security and analysis → Dependabot alerts / security updates`
- 효과: 의존성 PR 자동 생성. 12 CVE 같은 사건 발생 시 알림 + 자동 PR
- 비용: 0 (Free 플랜 포함)
- 보완재: `.github/workflows/security.yml`이 이미 주간 `pnpm audit` 실행 중

### Branch protection — 일반 사용자에게 적용

현재 ruleset은 admin bypass가 활성화되어 있습니다. 외주 협업자가 들어올 때:

- `Settings → Rules → Rulesets`의 Bypass list 검토
- 필요 시 admin도 PR을 통해 머지하도록 변경

### 환경별 `.env` 분리 정책

- `.env.development`, `.env.staging`, `.env.production` 분리
- secret 관리: Vault, AWS Parameter Store, GitHub Secrets 중 선택
- CI에 staging/production 배포 워크플로우 추가

---

## 🟡 우선순위 중간 (서비스 안정화 단계)

### Playwright e2e 테스트

- 현재 통합 테스트는 `auth-security.integration.spec.ts` 1개
- 핵심 사용자 흐름 5~10개 시나리오 추가:
  1. 회원가입 → 이메일 인증 → 로그인
  2. 게시글 작성 → 댓글 → 리액션
  3. 비밀번호 재설정 (이메일 발송 mock)
  4. OAuth 로그인 (Google 모킹)
  5. 어드민 콘텐츠 숨김/삭제
  6. 신고 생성 → 처리
  7. 2FA 설정·로그인
  8. 세션 관리 (다른 기기 로그아웃)
- CI에 별도 job 추가 (서비스 컨테이너 + Playwright runner)

### 운영 모니터링 (Observability)

- **Sentry** — 백엔드 + 프론트 에러 추적 (Free tier 충분)
- **PostHog** — 사용자 행동 분석 + 세션 리플레이
- **OpenTelemetry** — APM 표준화 (서비스 규모 커지면)
- 도입 시 `apps/core-backend/src/main.ts`와 `apps/core-frontend/src/instrumentation.ts`에 init

### CI/CD 배포 파이프라인

- 현재 `docker-compose.prod.yml`만 존재
- 추가 권장:
  - `.github/workflows/deploy.yml` — main 머지 시 staging 자동 배포
  - 태그 푸시 시 production 배포 (수동 승인 + rollback)
  - Docker image 빌드 + GHCR/ECR 푸시
  - DB migration 자동 적용 + rollback runbook

### 부하 테스트

- **k6** 또는 **artillery** — search·board·notification 엔드포인트 부하 측정
- 회귀 감지: `pnpm test:load` 추가 후 CI 주간 cron으로 실행
- 결과를 SecurityAuditReport와 비슷한 형태로 DB에 기록

---

## 🟢 우선순위 낮음 (장기)

### 프론트엔드 테스트 도입

- React Testing Library + Vitest 또는 Jest
- 우선 대상:
  - `useApiError` 훅
  - `RequirePermission` 컴포넌트
  - `DataTable` / `Tabs` / `ConfirmDialog`
  - `proxy.ts` 보호 경로 매칭 함수

### CODEOWNERS 파일

- `.github/CODEOWNERS`로 영역별 자동 리뷰 요청
- 외주 협업이 본격화되면 도입

### API 문서 풍부화

- Swagger 자동 생성은 이미 동작
- 추가:
  - 사용 예시 (`@ApiBody({ examples: ... })`)
  - 에러 코드 표준화 문서
  - 인증/CSRF 헤더 가이드

### Storybook 정상화

- 현재 `tsconfig`에서 stories 파일을 exclude한 상태 (build 통과 위해)
- 정상 사용하려면 `@storybook/react` 설치 + Storybook config 정비

### DB 백업·복구 runbook

- `docs/runbooks/db-backup.md` 신설
- pg_dump 스케줄, S3 업로드, point-in-time recovery 절차

### Lighthouse CI

- 프론트 성능 회귀 감지
- `.github/workflows/lighthouse.yml`로 PR마다 측정

---

## 📋 외주 프로젝트로 복제 시 체크리스트

이 보일러플레이트를 새 저장소로 복제하실 때:

1. ✅ **`README.md` 외주 안내 섹션 확인** — plan별 호환 매트릭스 + 3-layer secret guard
2. ✅ **Branch ruleset 적용** — plan에 맞춰 항목 조정 (Code Scanning은 Public/Team만)
3. ✅ **`.env.example` 복사 후 실제 값 입력**
4. ✅ **Dependabot 활성화**
5. ✅ **첫 PR로 CI 동작 확인** → 통과 후 ruleset Active 전환
6. ⚠️ **이 ROADMAP.md를 프로젝트 상황에 맞게 가지치기**
7. ⚠️ **CODEOWNERS / 운영 정책은 프로젝트별로 재작성**

---

## 🔗 관련 문서

- 보일러플레이트 헌장 (IN/OUT 범위 기준선): [`CHARTER.md`](CHARTER.md)
- 초기 종합 감사: [`docs/audits/weaver2-audit-2026-05-09.md`](docs/audits/weaver2-audit-2026-05-09.md)
- 헌장 점검 보고서: [`docs/audits/weaver2-charter-review-2026-05-09.md`](docs/audits/weaver2-charter-review-2026-05-09.md)
- CI/Ruleset 가이드: [`README.md`](README.md#-ci--github-actions)
- 기술 스택 / API: [`README.md`](README.md)
