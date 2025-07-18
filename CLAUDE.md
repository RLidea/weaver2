# Claude Code Assistant Guidelines

## 🚫 **커밋 메시지 가이드라인**

### 절대 포함하지 말 것
- `🤖 Generated with [Claude Code](https://claude.ai/code)`
- `Co-Authored-By: Claude <noreply@anthropic.com>`
- 기타 AI 생성 표시

### 커밋 메시지 스타일
- 간결하고 명확한 영어 커밋 메시지
- 기존 프로젝트 스타일 따라가기
- 기능 추가: `feat(scope): description`
- 버그 수정: `fix(scope): description`
- 리팩토링: `refactor(scope): description`
- 문서 업데이트: `docs(scope): description`

## 📝 **프로젝트 컨벤션**

### 네이밍 컨벤션
- 약어 사용 금지 (예: `errorMsg` → `errorMessage`)
- 일관된 네이밍 사용

### 아키텍처 원칙
- 관심사 분리 (Separation of Concerns)
- DRY (Don't Repeat Yourself)
- 명확한 폴더 구조 유지

## 🔧 **개발 환경**

### 명령어 규칙
- DB 명령어: `db:core:*` 형태로 앱별 구분
- 테스트 명령어: 기존 스타일 유지
- 빌드 명령어: 기존 스타일 유지

### DB 관련 처리 방침
- DB reset, migrate, generate 등의 명령어는 사용자가 직접 처리
- Claude는 스키마 수정만 담당하고 실제 마이그레이션은 사용자에게 위임

### 시드 로그 일관성
- 모든 시드 파일은 `seed-logger.ts`의 `logSeedResult` 함수 사용
- 일관된 로그 형식 유지: `✅ EntityName 'identifier' created!`
- 중복 시드 방지 및 적절한 경고 메시지 출력

### 코드 스타일
- ESLint/Prettier 설정 준수
- TypeScript 엄격 모드 사용
- 적절한 타입 정의

---

**참고**: 이 파일은 Claude 어시스턴트가 프로젝트에 대한 컨텍스트와 가이드라인을 유지하기 위해 사용됩니다.