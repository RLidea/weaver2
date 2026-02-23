# Weaver2

Weaver2는 NestJS 기반의 종합적인 웹 애플리케이션 백엔드 시스템입니다. 인증, 사용자 관리, 게시판, 관리자 기능을 포함한 확장 가능한 모노레포 구조로 설계되었습니다.

## 🚀 주요 기능

- **인증 시스템**: JWT 기반 로그인, 회원가입, 비밀번호 재설정
- **사용자 관리**: 프로필 관리, 프로필 이미지 업로드, 계정 설정
- **게시판 시스템**: 게시판/게시글/댓글 CRUD 관리
- **관리자 기능**: 대시보드, 사용자 관리, 시스템 통계
- **공유 컴포넌트 시스템**: 재사용 가능한 UI 컴포넌트 라이브러리
- **이메일 시스템**: SMTP 기반 이메일 발송 및 인증
- **파일 업로드**: 이미지 업로드 및 정적 파일 서빙
- **약관 관리**: 이용약관 버전 관리 및 동의 시스템

## 🛠️ 기술 스택

- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL, Prisma ORM
- **Authentication**: JWT, Passport.js
- **Email**: Nodemailer
- **File Upload**: Multer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier, Husky

## 📂 최상위 디렉토리 구조

-   `.`
    -   ├── `apps/`: 실행 가능한 애플리케이션들이 위치합니다.
    -   ├── `libs/`: 여러 애플리케이션에서 공유되는 라이브러리(모듈)들이 위치합니다.
    -   ├── `scripts/`: 프로젝트에서 사용되는 유틸리티 스크립트들이 위치합니다.
    -   ├── `package.json`: 프로젝트의 의존성 및 스크립트를 정의합니다.
    -   ├── `GEMINI.md`: Gemini 어시스턴트를 위한 프로젝트 가이드라인 및 컨텍스트 정보를 담고 있습니다.
    -   └── `tsconfig.json`: TypeScript 컴파일러 설정 파일입니다.

---

## 📱 애플리케이션 (`apps`)

### `core`

메인 애플리케이션입니다. API 서버의 핵심 비즈니스 로직이 모두 이곳에 구현됩니다.

-   `apps/core`
    -   ├── `prisma/`: 데이터베이스 스키마(`schema.prisma`), 마이그레이션 기록, 시드(seed) 스크립트가 포함됩니다. 이 디렉토리는 `core` 애플리케이션의 데이터베이스 관련 파일들을 관리합니다.
    -   ├── `src/`: 소스 코드가 위치합니다.
    -   │   ├── `main.ts`: 애플리케이션의 시작점(entry point)입니다.
    -   │   ├── `core.module.ts`: 루트 모듈(Root Module)입니다.
    -   │   ├── `modules/`: 기능별로 도메인이 분리된 모듈들이 위치합니다.
    -   │   │   ├── `auth/`: 인증/인가 (회원가입, 로그인, JWT) 관련 로직
    -   │   │   ├── `user/`: 사용자 정보 관리 관련 로직
    -   │   │   ├── `board/`: 게시판 관련 로직
    -   │   │   └── ... (기타 비즈니스 로직 모듈)
    -   │   ├── `decorator/`: 해당 애플리케이션(`core`) 내에서만 사용되는 커스텀 데코레이터가 위치합니다.
    -   │   ├── `public/`: 외부에 노출되는 정적 파일(HTML, CSS, JS)들이 위치합니다.
    -   │   │   ├── `health/`: 헬스체크 대시보드 관련 정적 파일
    -   │   │   └── `shared/`: 공유 컴포넌트 시스템 (카드, 버튼, 상태 배지 등)
    -   │   └── `types/`: 애플리케이션 전역에서 사용되는 타입 정의가 위치합니다.
    -   └── `test/`: E2E(End-to-End) 테스트 코드가 위치합니다.

---

## 📚 라이브러리 (`libs`)

여러 `apps`에서 공통으로 사용될 수 있는 재사용 가능한 기능들을 모아놓은 곳입니다.

-   `libs`
    -   ├── `common/`: 전역적으로 사용될 가능성이 높은 유틸리티, 데코레이터, 예외 필터, 인터셉터 등이 위치합니다.
    -   │   └── `src/`
    -   │       ├── `decorator/`: 여러 앱에서 공용으로 사용할 데코레이터 (`@Public`, `@AuthUser` 등)
    -   │       └── `global/`: NestJS의 전역(Global) 기능 모음 (Exception Filters, Interceptors, Middlewares 등)
    -   ├── `pagination/`: 페이지네이션(Pagination) 관련 DTO 및 서비스 로직을 제공하는 라이브러리입니다.
    -   └── `prisma/`: Prisma 클라이언트 서비스를 앱에 주입하기 위한 모듈입니다. 이 라이브러리는 Prisma 관련 로직을 추상화하여 다른 모듈에서 데이터베이스 접근을 용이하게 합니다.

---

## 🛠️ 주요 실행 명령어

### 개발 및 빌드
```bash
pnpm dev          # 개발 모드로 core 애플리케이션 실행
pnpm debug        # 디버그 모드로 실행
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 모드로 실행
```

### 테스트
```bash
pnpm test         # 유닛 테스트 실행
pnpm test:watch   # 테스트 감시 모드
pnpm test:e2e     # E2E 테스트 실행
pnpm test:cov     # 테스트 커버리지 확인
```

### 데이터베이스
```bash
pnpm db:generate  # Prisma 클라이언트 생성
pnpm db:migrate   # 마이그레이션 실행
pnpm db:reset     # 데이터베이스 초기화
pnpm db:seed      # 시드 데이터 생성
```

### 코드 품질
```bash
pnpm lint         # ESLint 코드 검사
pnpm format       # Prettier 코드 포맷팅
```

---

## 🏗️ 데이터베이스 스키마

### 주요 모델

#### User (사용자)
- **기본 정보**: UUID, 사용자명, 표시명, 프로필 이미지
- **역할**: USER, ADMIN, MODERATOR, DEVELOPER
- **타임스탬프**: 생성일, 수정일, 삭제일, 마지막 로그인

#### Auth (인증)
- **인증 정보**: 이메일, 비밀번호, 이메일 인증
- **보안**: 비밀번호 재설정 토큰, 2FA 지원
- **OAuth**: 외부 인증 제공자 연동 지원

#### Board System (게시판)
- **Board**: 게시판 정보 (이름, 설명)
- **Post**: 게시글 (제목, 내용, 작성자)
- **Comment**: 댓글 (내용, 작성자)

#### UserSetting (사용자 설정)
- **알림 설정**: 이메일, SMS, 푸시 알림
- **개인화**: 다크 모드, 마케팅 동의

#### Terms (약관)
- **버전 관리**: 약관 버전별 관리
- **동의 기록**: 사용자별 약관 동의 이력

---

## 🔌 API 엔드포인트

### 인증 (Authentication)
```
POST /auth/sign-in              # 로그인
POST /auth/sign-up/email        # 이메일 회원가입
GET  /auth/verify               # 이메일 인증
POST /auth/refresh              # 토큰 갱신
POST /auth/password/request-reset # 비밀번호 재설정 요청
POST /auth/password/reset       # 비밀번호 재설정
POST /auth/sign-out             # 로그아웃

GET  /auth/oauth/:provider          # OAuth 로그인 페이지 리다이렉트 (google | kakao | naver)
GET  /auth/oauth/:provider/callback # OAuth 콜백 처리 및 JWT 발급
```

### 사용자 (Users)
```
GET    /users/me                # 본인 정보 조회
PATCH  /users/me                # 프로필 수정
PATCH  /users/me/password       # 비밀번호 변경
DELETE /users/me                # 계정 탈퇴
POST   /users/me/profile-image  # 프로필 이미지 업로드
```

### 게시판 (Boards)
```
GET    /boards                  # 게시판 목록
POST   /boards                  # 게시판 생성 (관리자)
GET    /boards/:id              # 게시판 조회
PATCH  /boards/:id              # 게시판 수정 (관리자)
DELETE /boards/:id              # 게시판 삭제 (관리자)

GET    /boards/:boardId/posts           # 게시글 목록
POST   /boards/:boardId/posts           # 게시글 생성
GET    /boards/:boardId/posts/:postId   # 게시글 조회
PATCH  /boards/:boardId/posts/:postId   # 게시글 수정
DELETE /boards/:boardId/posts/:postId   # 게시글 삭제

GET    /boards/:boardId/posts/:postId/comments           # 댓글 목록
POST   /boards/:boardId/posts/:postId/comments           # 댓글 생성
PATCH  /boards/:boardId/posts/:postId/comments/:commentId # 댓글 수정
DELETE /boards/:boardId/posts/:postId/comments/:commentId # 댓글 삭제
```

### 관리자 (Admin)
```
GET /admin/dashboard/summary    # 대시보드 통계
GET /admin/dashboard           # 대시보드 페이지
GET /admin/user-management     # 사용자 관리 페이지
GET /admin/analytics           # 분석 페이지
GET /admin/content-management  # 컨텐츠 관리 페이지
```

### 헬스체크 및 모니터링
```
GET /v1/health                 # 시스템 헬스체크 (API v1)
GET /v1/health/ready           # Kubernetes 준비성 검사 (API v1)
GET /v1/health/live            # Kubernetes 생존성 검사 (API v1)
GET /health/dashboard          # 헬스체크 대시보드 (View)
GET /health/dashboard.js       # 대시보드 JavaScript (View)
GET /health/dashboard.css      # 대시보드 CSS (View)
```

### 정적 파일 서빙
```
GET /static/shared/:type/:file # 공유 스타일/컴포넌트 파일
GET /static/shared/components/:component/:file # 컴포넌트별 파일
```

### 기타
```
POST /email                    # 이메일 발송
GET  /terms/latest             # 최신 약관 조회
```

---

## 📦 모듈 구조

### Core 모듈들

#### 🔐 Auth 모듈
- JWT 기반 인증 시스템
- 이메일 인증 및 비밀번호 재설정
- 리프레시 토큰 관리
- 레이트 리미팅 적용
- **OAuth 소셜 로그인**: Google, Kakao, Naver 지원 (passport 없이 native fetch 방식)
  - 동일 이메일 계정 자동 연동
  - 신규 사용자 자동 회원가입

**OAuth 보안 처리:**
- **CSRF 방어**: 로그인 시작 시 `state` 값을 생성해 `oauth_state` HttpOnly 쿠키에 저장. 콜백에서 쿠키 값과 query `state`를 비교 검증 후 쿠키 삭제.
- **에러/거부 처리**: provider가 `error` 파라미터를 반환하거나 `code`/`state`가 없으면 `OAUTH_FAILURE_REDIRECT_URL`로 리다이렉트. 토큰 교환/프로필 조회 중 예외 발생 시에도 동일하게 처리.

**새 OAuth 프로바이더 추가 방법:**

1. `apps/core/src/features/auth/oauth/providers/` 에 새 파일 생성 (`github.provider.ts` 등)
2. `OAuthProvider` 인터페이스 구현 (`name`, `getAuthorizationUrl`, `exchangeCodeForTokens`, `getUserProfile`)
3. `oauth.module.ts`의 `providers` 배열에 등록하고 `OAUTH_PROVIDERS_INIT` factory의 `inject`에 추가
4. `.env`에 환경변수 3개 추가 (`{PROVIDER}_CLIENT_ID`, `{PROVIDER}_CLIENT_SECRET`, `{PROVIDER}_CALLBACK_URL`)

```typescript
// 예시: github.provider.ts
@Injectable()
export class GithubOAuthProvider implements OAuthProvider {
  readonly name = 'github';
  // getAuthorizationUrl, exchangeCodeForTokens, getUserProfile 구현
}
```

#### 👤 User 모듈
- 사용자 프로필 관리
- 프로필 이미지 업로드
- 비밀번호 변경 및 계정 탈퇴
- 역할 기반 접근 제어

#### 📝 Board 모듈
- 게시판/게시글/댓글 CRUD
- 계층적 라우팅 구조
- 작성자 권한 확인
- 관리자 전용 게시판 관리

#### 🔧 Admin 모듈
- 실시간 통계 대시보드
- 사용자 관리 인터페이스
- API와 View 분리 구조
- 정적 HTML 페이지 제공

#### 🏥 Health 모듈
- 시스템 헬스체크 API
- 실시간 모니터링 대시보드
- Kubernetes 준비성/생존성 검사
- Glassmorphism UI 적용

#### 📁 Static 모듈
- 공유 컴포넌트 시스템 서빙
- 정적 파일 제공 및 관리
- 컴포넌트별 파일 라우팅

#### 📧 Email 모듈
- SMTP 기반 이메일 발송
- 이메일 템플릿 관리
- 인증 및 비밀번호 재설정 이메일

#### 📄 Terms 모듈
- 약관 버전 관리
- 사용자 동의 기록
- 회원가입 시 약관 동의 연동

#### 🎨 Shared Component System (공유 컴포넌트 시스템)
- **Glassmorphism 디자인**: 반투명 배경과 블러 효과 적용
- **재사용 가능한 컴포넌트**: Card, Button, Status Badge, Progress Meter 등
- **일관된 디자인 시스템**: CSS 변수 기반 통합 스타일 관리
- **모듈화된 구조**: ES6 모듈 패턴으로 구현
- **확장 가능한 아키텍처**: Web Components로 마이그레이션 준비
- **서빙 엔드포인트**: 
  - `/static/shared/styles/:file` - 스타일 파일
  - `/static/shared/components/:component/:file` - 컴포넌트 파일
- **상세 가이드**: `apps/core/src/public/shared/GUIDE.md` 참조

### 공통 라이브러리

#### 🛠️ Common 라이브러리
- 전역 데코레이터 (`@Public`, `@AuthUser`)
- 예외 필터 및 인터셉터
- 미들웨어 및 파이프
- 유틸리티 함수

#### 📄 Pagination 라이브러리
- 페이지네이션 DTO
- 페이지네이션 서비스
- 표준화된 응답 구조

#### 🗄️ Prisma 라이브러리
- Prisma 클라이언트 서비스
- 데이터베이스 연결 관리
- 트랜잭션 처리

---

## 🏛️ 아키텍처 특징

### 모듈화 및 확장성
- **3계층 아키텍처**: Features/Infrastructure/System 레이어 분리
- **Command/Query 패턴**: Repository 레이어에서 읽기/쓰기 분리
- **모듈 분리**: 기능별 독립적인 모듈 구성
- **라이브러리 공유**: 공통 기능의 라이브러리화
- **타입 안정성**: TypeScript 기반 타입 안정성
- **의존성 주입**: NestJS DI 컨테이너 활용
- **API 버전 관리**: URI 기반 버전 관리 (/v1/)

### 보안 및 인증
- **JWT 인증**: 쿠키 기반 토큰 인증 시스템
- **역할 기반 접근 제어**: 사용자 역할별 권한 관리 (USER, ADMIN, MODERATOR, DEVELOPER)
- **레이트 리미팅**: 민감한 엔드포인트 요청 제한
- **보안 미들웨어**: Helmet, CSRF 보호, 보안 헤더
- **가드 시스템**: JWT, Local, Roles 가드로 다층 보안

### 데이터 관리
- **Repository 패턴**: `.query.ts`와 `.command.ts`로 읽기/쓰기 명확히 분리
- **트랜잭션 관리**: Prisma를 통한 데이터 일관성 보장
- **마이그레이션**: 스키마 버전 관리 및 자동 마이그레이션
- **시드 데이터**: 초기 데이터 설정 및 개발용 더미 데이터
- **Soft Delete**: 사용자 데이터 안전한 삭제 처리

### 개발 경험
- **자동 문서화**: Swagger/OpenAPI 지원
- **코드 품질**: ESLint, Prettier 적용
- **테스트**: Jest 기반 테스트 환경
- **Git 훅**: Husky를 통한 커밋 전 검사

---

## 🚀 시작하기

### 1. 환경 설정
```bash
# 의존성 설치
pnpm install

# 환경 변수 설정 (.env 파일 생성)
cp .env.example .env
```

### 2. 데이터베이스 설정
```bash
# Prisma 클라이언트 생성
pnpm db:generate

# 마이그레이션 실행
pnpm db:migrate

# 시드 데이터 생성
pnpm db:seed
```

### 3. 개발 서버 실행
```bash
# 개발 모드 실행
pnpm dev

# 서버 실행 확인
# http://localhost:3000
```

### 4. API 문서 확인
```bash
# Swagger UI 접속
# http://localhost:3000/docs
```
