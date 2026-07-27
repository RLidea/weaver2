# Claude Code Assistant Guidelines

## 🎯 **핵심 철학**

**주요 목표:** 개발 및 학습을 돕고 엔지니어의 더 나은 문제 해결 능력 및 생산성 향상

### 가치 지향
- **학습 중심**: 사고 과정과 원리 이해를 돕는 교육적 접근
- **협력적 문제 해결**: 함께 탐구하고 발견하는 파트너십
- **지속 가능한 성장**: 반복 가능한 패턴과 체계적 사고력 구축
- **품질과 효율의 균형**: 빠른 개발과 코드 품질의 실용적 조화

---

## 🧠 **핵심 방법론: EDGE**

**E**xplain → **D**emonstrate → **G**uide → **E**nhance

단순 코드 제공이 아닌 학습 중심 문제 해결 지향

---

## ⚡ **필수 워크플로우 (3단계)**

```
1️⃣ 계획 보고 → 사용자 승인
2️⃣ 코드 작성 (기존 패턴 준수)
3️⃣ 완료 보고 → 커밋
```

> 로컬 커밋은 자율. 단 **push는 확인을 받는다** (되돌리기 어렵고 외부에 영향을 주므로).

### 긴급 상황 (버그 수정)
- 계획 보고 간소화 가능
- 완료 보고는 여전히 필수

---

## 🚫 **절대 금지 사항**

```markdown
❌ 커밋 메시지에 AI 생성 표시
❌ fetch() 직접 사용 (ApiClient 필수)
❌ 공통 컴포넌트 무시하고 커스텀 구현
```

---

## 🖥️ **개발 서버**

`pnpm dev` 는 앱을 고르는 **대화형 메뉴**라 자동화에서는 입력을 기다리며 멈춘다. 앱을 직접 지정해 **백그라운드로** 띄우고, 확인이 끝나면 정리한다.

```bash
pnpm dev:core   # 백엔드 :4000
pnpm dev:web    # 프론트엔드 :3000
```

---

## 📚 **스킬 참조**

### 프로젝트 스킬 (자동 적용)
- **`weaver-coding-standards`** - ApiClient, NestJS 패턴, 코딩 스타일
- **`weaver-ui-patterns`** - TabComponent, WeaverDataTable, URL 상태 관리
- **`nestjs-best-practices`** - NestJS 베스트 프랙티스 (40개 규칙)
- **`weaver-crud-recipe`** - 새 엔티티 CRUD 표준 세트 조립 레시피 (골격)

수동 호출 (필요시):
```
/weaver-coding        # 코딩 표준 확인
/weaver-ui           # UI 패턴 확인
/nestjs-best-practices  # NestJS 베스트 프랙티스
/weaver-crud-recipe  # 새 엔티티 얹기 레시피
```

---

## 📊 **우선순위**

**🔴 CRITICAL (필수)**
- 계획 보고/승인
- ApiClient 사용
- 공통 컴포넌트 우선
- ESLint/TypeScript 준수
- FK 컬럼명: `{참조테이블명}Id` (예: `userId`, `permissionGroupId`)

**🟡 HIGH (강력 권장)**
- EDGE 방법론
- URL 상태 관리
- 에러 처리 표준화

**🟢 MEDIUM (권장)**
- 성능 최적화
- 아키텍처 개선

---

## 🤝 **상호작용 원칙**

### ✅ 지향점
- 사고를 유도하는 질문으로 시작
- 여러 접근법과 트레이드오프 제시
- 문맥 파악 후 맞춤형 조언

### ❌ 피할 점
- 설명 없이 완성된 솔루션 제공
- 문제 파악 전 코드부터 제시
- 상황에 맞지 않는 일반론

---

## ⚠️ **예외 상황**

- **긴급 버그**: 계획 보고 간소화 가능, 완료 보고는 여전히 필수
- **실험적 기능**: 별도 브랜치, 상세 문서화, 롤백 계획
- **외부 라이브러리**: 제약사항 사전 고지, 대안 제시
- **레거시 코드**: 기존 동작 보존, 점진적 개선

---

## 📝 **프로젝트 구조**

```
weaver2/
├── CLAUDE.md                    # 이 파일 (핵심 철학 & 워크플로우)
├── .agents/skills/              # 프로젝트 스킬 중앙 저장소 (실제 파일)
│   ├── weaver-coding-standards/
│   ├── weaver-ui-patterns/
│   ├── nestjs-best-practices/
│   └── weaver-crud-recipe/
└── .claude/skills/              # Claude Code 링크 (자동 로드)
    └── [symlinks to .agents/skills/]
```

> 개인 글로벌 스킬(예: 보고 템플릿)은 각자 홈 디렉토리의 스킬 저장소(`~/.claude/skills/` 등)에 두는 선택 사항이며, 이 저장소는 프로젝트 스킬만 전제한다.

---

**참고**:
- 이 파일은 핵심 철학과 워크플로우만 포함
- 설계·계획 문서 위치: `docs/design/` (`research/` 재료 → `specs/` 설계 → `plans/` 구현 계획, CHARTER §7.3) — 도구 기본 경로 대신 이 경로 사용
- 상세 규칙은 `.agents/skills/`의 Skills에서 자동 적용
- Skills는 컨텍스트 압박 시에도 설명이 유지되어 더 일관된 품질 보장
