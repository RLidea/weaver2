# Security Policy

## 🛡️ Supported Versions

`weaver2`는 보일러플레이트이므로 항상 **`main` 브랜치의 최신 커밋만 보안 패치를 받습니다**.
이 저장소를 fork·복제해서 운영 중인 프로젝트는 자체 정책을 두셔야 합니다.

| 대상 | 보안 패치 |
|------|----------|
| `main` 브랜치 | ✅ 활성 |
| 과거 태그 | ❌ 없음 (필요 시 직접 cherry-pick) |
| 외주 복제본 | 각 프로젝트 책임 |

---

## 🚨 Reporting a Vulnerability

### 🔒 비공개 보고 (권장)

[GitHub Security Advisories](https://github.com/RLidea/weaver2/security/advisories/new)를 통해 비공개로 보고해주세요.

- 공격 시나리오 + 재현 절차
- 영향 범위 (어떤 라우트·기능)
- 가능하면 PoC

대응 시한:
- **48시간 이내** 접수 확인 (Acknowledge)
- **7일 이내** 초기 분류 + 등급 부여 (CVSS 기준)
- **30일 이내** 패치 배포 (High/Critical은 가능한 빨리)

### 📢 공개 보고가 필요한 경우

이미 공개된 CVE이거나 third-party 라이브러리 이슈인 경우 일반 Issue로도 가능합니다.

---

## 🔐 Built-in Security Layers

이 보일러플레이트가 기본 제공하는 보안 장치 (외주 복제 시 그대로 따라옴):

### 인증·세션

- JWT HttpOnly 쿠키 (Access 15분 / Refresh 최대 30일, `sameSite=lax`)
- Refresh token rotation + **재사용(탈취) 감지** (회전 토큰 재제시 시 grace window 밖이면 전 세션 무효화)
- 토큰은 저장 시 보호: refresh·비밀번호 재설정·이메일 인증 토큰은 SHA-256 해시, TOTP secret은 AES-256-GCM 암호화(`TOTP_ENCRYPTION_KEY`)
- 인증 토큰은 HttpOnly 쿠키로만 전달 (응답 body에 평문 노출 안 함)
- 계정 잠금 (5회 실패 → 15분)
- 계정 정지 (`suspendedUntil`)
- 비밀번호 변경·재설정 시 전체 세션 무효화
- 2FA: TOTP + Email OTP

### 권한

- 역할 대신 **권한 그룹** 기반
- `@RequirePermission` 데코레이터 + `PermissionGuard` (글로벌)
- 프론트: `RequirePermission` 컴포넌트 + `hasPermission()` 와일드카드
- 익명 IDOR 차단 (`board-permission.service.ts`)

### CSRF·XSS·헤더

- `csrf-csrf` (active maintenance) + double-submit 패턴
- Helmet (HSTS, X-Frame-Options, CSP 등)
- `useStaticAssets`에 dotfile 차단·index 비활성

### Rate Limiting

- 전역 60초/100회
- sign-in: 60초/10회
- 2FA: 60초/3~5회
- password-reset: 60초/3~5회
- email-change: 60초/3~5회
- upload: 60초/10회
- search: 60초/20회
- report: 60초/5회

### Secret 관리

- 3-layer 가드 (`.gitignore` + husky pre-commit + CI `secret-files` job)
- 차단 패턴: `.env*` (단, `.env.example` 예외), `*.pem/.key/.p12/.pfx/.crt/.cer`, `id_rsa*`, `id_ed25519*`

### CI 자동 스캔

- `pnpm audit --audit-level=high` 매주 월 09:00 KST + 의존성 PR마다
- CodeQL `security-extended` 매주 월 14:00 KST + PR마다
- 발견 시 GitHub Issue 자동 생성 또는 PR 차단

### 의존성 정책

- High/Critical CVE 발견 시 **즉시 패치 PR**
- Dependabot 활성화 권장 (외주 복제 시도 동일)
- `package.json`의 `engines.node >= 22`, `pnpm >= 11` 강제

---

## 📋 보안 사고 대응 (Incident Response)

### 1단계 — 발견·접수

- Security Advisory 또는 내부 모니터링 (Sentry, CodeQL Issue)
- 영향 범위 평가: 어떤 사용자·데이터·기간

### 2단계 — 격리

- 즉시 영향 라우트 비활성화 (feature flag 또는 deploy 롤백)
- 필요 시 영향 사용자 세션 강제 만료

### 3단계 — 패치

- `fix/security-XXX` 브랜치에서 작업
- 회귀 방지 unit test 함께 추가 (필수)
- High/Critical은 PR 리뷰어 2명 + 시니어 sign-off

### 4단계 — 배포

- staging 검증 후 즉시 production deploy
- DB 마이그레이션 동반 시 rollback plan 준비

### 5단계 — 사후 대응

- 영향 사용자 알림 (개인정보보호법 이슈면 신고 의무)
- Postmortem 작성 (`docs/incidents/<date>-<title>.md`)
- 재발 방지 액션 → ROADMAP.md 또는 Issue로 등록

---

## 🤖 자동화된 보안 검사

```
모든 PR
   ↓
ci.yml::secret-files          ← .env/key 파일 차단
ci.yml::test-integration      ← auth-security 회귀 테스트
codeql.yml                    ← security-extended 정적 분석
security.yml                  ← deps 변경 시 audit

매주 월요일
   ↓
security.yml::audit (09:00)   ← pnpm audit
codeql.yml::analyze (14:00)   ← CodeQL 신규 룰 적용
```

---

## 📞 Contact

- 보안 보고: GitHub Security Advisories (위 링크)
- 일반 문의: Issue 또는 README의 메인 contact

---

`m(_ _)m` 보안 보고에 감사드립니다. 사용자 안전을 함께 지켜주시는 모든 분께 감사합니다.
