# weaver-crud-recipe 골격 + 문서 정비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설계 v2(`docs/superpowers/specs/2026-07-10-weaver2-crud-recipe-design.md`)의 1차분 구현 — 죽은 참조 정정, nestjs-best-practices 스킬 복원·추적, 스킬 심링크 추적, `weaver-crud-recipe` 골격 SKILL.md 작성, 문서 반영.

**Architecture:** 코드 변경 없음 — 문서·스킬·git 구성만 다룬다. 각 태스크는 독립 커밋 단위이며, 검증은 grep/ls/git 명령의 실제 출력 확인으로 한다 (pre-commit 훅이 jest 102개를 자동 실행하므로 커밋 성공 = 테스트 통과).

**Tech Stack:** Markdown 스킬 (agent-agnostic `.agents/skills/` + `.claude/skills/` 심링크), gitignore 패턴.

## Global Constraints

- 커밋 메시지: 영어 제목 + 한국어 본문 병기, AI 생성 표시 절대 금지 (`CONTRIBUTING.md`)
- `git push` 금지 — 로컬 커밋까지만 (push는 주인님 확인 필요)
- 레시피 포인터는 파일·심볼 수준만 — 라인 번호 금지 (설계 v2 §5.3)
- "관리자 화면"은 "골격 표준"으로 표현 — "완전 표준" 표현 금지 (설계 v2 §3-4)
- `references/*` 상세 문서는 이번 계획 범위 밖 — 첫 실전 fork에서 작성 (설계 v2 §4-6)

---

### Task 1: CHARTER §7.3 gitignore 서술 정정

**Files:**
- Modify: `CHARTER.md` (§7.3 커밋·문서 규칙)

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (독립 문서 수정)

- [ ] **Step 1: 현재 서술이 실제와 어긋남을 확인**

Run: `grep -n "docs/\*" CHARTER.md && grep -n "^docs/" .gitignore`
Expected: CHARTER에 "`docs/*` 는 git ignore" 문구, .gitignore에는 `docs/local/`만 존재 — 불일치 확인

- [ ] **Step 2: CHARTER.md §7.3 수정**

old_string:
```
- `docs/*` 는 git ignore (`!docs/audits/` 만 추적). 시점 보고서는 `docs/audits/<topic>-<YYYY-MM-DD>.md`.
```

new_string:
```
- `docs/` 는 전체 git 추적, `docs/local/`만 제외(임시/로컬 작업 노트). 시점 보고서는 `docs/audits/<topic>-<YYYY-MM-DD>.md`.
```

- [ ] **Step 3: 검증**

Run: `grep -n "docs/local" CHARTER.md`
Expected: §7.3에 수정된 문구 1건

- [ ] **Step 4: Commit**

```bash
git add CHARTER.md
git commit -m "docs(charter): fix stale docs gitignore description in 7.3

§7.3의 'docs/* 는 git ignore(!docs/audits/만 추적)' 서술이 실제
.gitignore(docs/ 전체 추적, docs/local/만 제외)와 어긋나 정정."
```

---

### Task 2: nestjs-best-practices 스킬 복원 및 git 추적

**Files:**
- Create: `.agents/skills/nestjs-best-practices/` (SKILL.md + rules/ + references/ + assets/ — 업스트림 구성 그대로)
- Modify: `.gitignore` (87행 부근 `.agents/skills/nestjs-best-practices` 제거)

**Interfaces:**
- Consumes: 업스트림 https://github.com/Kadajett/agent-nestjs-skills (40개 규칙 — CLAUDE.md 서술과 일치 확인됨)
- Produces: `.agents/skills/nestjs-best-practices/SKILL.md` — Task 3 심링크가 이 경로를 가리킴

- [ ] **Step 1: 업스트림을 스크래치에 클론**

Run: `CLONE_DIR="/private/tmp/claude-501/-Users-devcjkim-Workspace-Centell-Projects-Tools-weaver2/b1d2f408-0edb-43f9-b903-0166010efadb/scratchpad/agent-nestjs-skills-clone"; git clone --depth 1 https://github.com/Kadajett/agent-nestjs-skills "$CLONE_DIR" 2>&1 | tail -1`
Expected: 클론 성공. 실패(네트워크/저장소 이동) 시 중단하고 보고 — 대체 출처를 임의로 고르지 말 것

- [ ] **Step 2: 스킬 구성 확인 후 복사**

(주의: 셸 변수는 호출 간 유지되지 않는다 — 아래처럼 전체 경로를 그대로 쓴다. 이하 `<SCRATCH>` = `/private/tmp/claude-501/-Users-devcjkim-Workspace-Centell-Projects-Tools-weaver2/b1d2f408-0edb-43f9-b903-0166010efadb/scratchpad`)

Run: `ls <SCRATCH>/agent-nestjs-skills-clone/` — SKILL.md가 저장소 루트에 있는지, 스킬이 하위 디렉토리인지 확인.
루트형이면:
```bash
mkdir -p .agents/skills/nestjs-best-practices
rsync -a --exclude .git <SCRATCH>/agent-nestjs-skills-clone/ .agents/skills/nestjs-best-practices/
```
하위 디렉토리형이면 해당 디렉토리만 같은 방식으로 복사.
Expected: `.agents/skills/nestjs-best-practices/SKILL.md` 존재

- [ ] **Step 3: SKILL.md frontmatter의 name 확인**

Run: `head -5 .agents/skills/nestjs-best-practices/SKILL.md`
Expected: frontmatter에 `name: nestjs-best-practices`. 다르면 디렉토리명을 frontmatter name에 맞춰 정정

- [ ] **Step 4: .gitignore에서 제외줄 제거**

`.gitignore`에서 다음 줄 삭제:
```
.agents/skills/nestjs-best-practices
```

- [ ] **Step 5: 추적 확인**

Run: `git check-ignore .agents/skills/nestjs-best-practices/SKILL.md; echo "exit=$?"`
Expected: 출력 없음 + `exit=1` (더 이상 ignore 아님)

- [ ] **Step 6: Commit**

```bash
git add .gitignore .agents/skills/nestjs-best-practices
git commit -m "chore(skills): vendor nestjs-best-practices skill into repo

CLAUDE.md가 참조하는 nestjs-best-practices 스킬(업스트림
Kadajett/agent-nestjs-skills, 40개 규칙)이 gitignore로 제외되어
작업 트리에 부재했음. 팀 공용 base로서 클론 직후 동작하도록
저장소에 포함하고 ignore 줄 제거."
```

---

### Task 3: .claude/skills 심링크 생성 및 git 추적

**Files:**
- Modify: `.gitignore` (79행 `.claude` → `.claude/*` + `!.claude/skills`)
- Create: `.claude/skills/weaver-coding-standards`, `.claude/skills/weaver-ui-patterns`, `.claude/skills/nestjs-best-practices` (심링크)

**Interfaces:**
- Consumes: Task 2의 `.agents/skills/nestjs-best-practices/`
- Produces: `.claude/skills/` 디렉토리 — Task 4가 여기에 `weaver-crud-recipe` 심링크를 추가

- [ ] **Step 1: .gitignore 패턴 수정**

주의: git은 **상위 디렉토리가 통째로 제외되면 하위 재포함(!)이 불가능**하다. 그래서 `.claude` 한 줄을 아래 두 줄로 바꾼다 (`.claude/*`는 직계 자식들을 개별 제외하므로 skills만 재포함 가능):

old_string:
```
.claude
```

new_string:
```
.claude/*
!.claude/skills
```

- [ ] **Step 2: 심링크 생성 (상대 경로 — 클론 위치 무관)**

```bash
mkdir -p .claude/skills
ln -s ../../.agents/skills/weaver-coding-standards .claude/skills/weaver-coding-standards
ln -s ../../.agents/skills/weaver-ui-patterns .claude/skills/weaver-ui-patterns
ln -s ../../.agents/skills/nestjs-best-practices .claude/skills/nestjs-best-practices
```

- [ ] **Step 3: 심링크 해석 + 추적 검증**

Run: `ls -la .claude/skills/ && readlink .claude/skills/weaver-coding-standards && git check-ignore .claude/skills/weaver-coding-standards; echo "exit=$?"`
Expected: 심링크 3개, readlink가 `../../.agents/skills/weaver-coding-standards` 출력, check-ignore 출력 없음 + `exit=1`

Run: `git status --short .claude/`
Expected: `.claude/skills/` 심링크 3개만 신규로 잡히고, `.claude/settings.local.json` 등 다른 로컬 파일은 잡히지 않음

- [ ] **Step 4: Commit**

```bash
git add .gitignore .claude/skills
git commit -m "chore(skills): track .claude/skills symlinks for out-of-box skill loading

.claude 전체가 gitignore라 스킬 심링크가 fork/클론에 따라가지 않아
CLAUDE.md가 서술한 '자동 로드' 구조가 실제론 동작하지 않았음.
.claude/* + !.claude/skills 패턴으로 심링크만 추적 (로컬 설정은
계속 제외). 클론 직후부터 프로젝트 스킬이 로드되도록 함."
```

---

### Task 4: weaver-crud-recipe 골격 SKILL.md 작성

**Files:**
- Create: `.agents/skills/weaver-crud-recipe/SKILL.md`
- Create: `.claude/skills/weaver-crud-recipe` (심링크)

**Interfaces:**
- Consumes: Task 3의 `.claude/skills/` 디렉토리
- Produces: 스킬 `weaver-crud-recipe` — Task 5의 문서들이 이 이름을 참조

- [ ] **Step 1: SKILL.md 작성**

`.agents/skills/weaver-crud-recipe/SKILL.md` 전체 내용 (아래 그대로):

````markdown
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
- `weaver-ui-patterns` — 글래스모피즘·테이블·탭 UI 패턴
- `nestjs-best-practices` — NestJS 일반 베스트 프랙티스
````

- [ ] **Step 2: 심링크 추가**

```bash
ln -s ../../.agents/skills/weaver-crud-recipe .claude/skills/weaver-crud-recipe
```

- [ ] **Step 3: 포인터 실재 검증 (rot 0으로 시작)**

Run:
```bash
for f in \
  apps/core-backend/prisma/schema/board.prisma \
  apps/core-backend/src/features/board/controllers/board.controller.ts \
  apps/core-backend/src/features/board/repositories/find-all-boards.query.ts \
  apps/core-backend/src/features/board/dto/create-board.dto.ts \
  apps/core-backend/prisma/seed/permission-group.seed.ts \
  "apps/core-frontend/src/app/(admin)/admin/boards/page.tsx" \
  apps/core-frontend/src/features/board/api/board.api.ts \
  ; do [ -e "$f" ] && echo "OK $f" || echo "MISSING $f"; done
```
Expected: 전부 `OK`. `MISSING`이 하나라도 있으면 SKILL.md 포인터를 실제 경로로 정정 후 재실행

Run: `grep -n "createBoard\|findAllBoards\|updateBoard\|deleteBoard" apps/core-backend/src/features/board/controllers/board.controller.ts | head -5`
Expected: 심볼 4개 모두 존재

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/weaver-crud-recipe .claude/skills/weaver-crud-recipe
git commit -m "feat(skills): add weaver-crud-recipe skeleton skill

'범용 레코드 CRUD' 방향(설계 v2)의 1차분 — 새 엔티티 표준 세트
정의(슬림 코어), Board 미러링 포인터(심볼 수준), 게시판 특수 기능
경계선, 신선도 점검 규칙을 담은 골격 v0.1. 상세 references/는
첫 실전 fork 경험으로 채운다."
```

---

### Task 5: 문서 반영 (CHARTER §6 · CLAUDE.md · README)

**Files:**
- Modify: `CHARTER.md` (§6 확장 포인트 표)
- Modify: `CLAUDE.md` (프로젝트 스킬 목록 · 수동 호출 · 프로젝트 구조 다이어그램)
- Modify: `README.md` (프로젝트 구조 섹션 뒤)

**Interfaces:**
- Consumes: Task 4의 스킬 이름 `weaver-crud-recipe`
- Produces: 없음 (최종 문서화)

- [ ] **Step 1: CHARTER §6 표에 행 추가**

§6 표의 마지막 행(이메일 템플릿) 뒤에 추가:

```
| `.agents/skills/weaver-crud-recipe/` | 새 엔티티 CRUD 표준 세트 조립 레시피 (골격 — `references/` 상세는 fork 경험으로 확장) |
```

- [ ] **Step 2: CLAUDE.md 스킬 참조 갱신**

"### 프로젝트 스킬 (자동 적용)" 목록의 `nestjs-best-practices` 줄 뒤에 추가:

```
- **`weaver-crud-recipe`** - 새 엔티티 CRUD 표준 세트 조립 레시피 (골격)
```

"수동 호출 (필요시)" 코드 블록에 추가:

```
/weaver-crud-recipe  # 새 엔티티 얹기 레시피
```

"## 📝 프로젝트 구조" 다이어그램의 `.agents/skills/` 나열에 `│   └── nestjs-best-practices/` 를 `│   ├── nestjs-best-practices/` 로 바꾸고 그 아래 추가:

```
│   └── weaver-crud-recipe/
```

- [ ] **Step 3: README 프로젝트 구조 섹션 뒤에 안내 추가**

README.md의 프로젝트 구조 코드블록 닫힘(```) 과 다음 `---` 사이에 추가:

```markdown

> **새 엔티티(CRUD) 추가**: [.agents/skills/weaver-crud-recipe/SKILL.md](.agents/skills/weaver-crud-recipe/SKILL.md) 레시피를 따른다 — 표준 세트 정의·미러링 포인터·경계선. 배경은 [CHARTER §5.1](CHARTER.md).
```

- [ ] **Step 4: 검증**

Run: `grep -c "weaver-crud-recipe" CHARTER.md CLAUDE.md README.md`
Expected: `CHARTER.md:1` `CLAUDE.md:3` `README.md:1` (grep -c는 매칭 줄 수 기준)

- [ ] **Step 5: Commit**

```bash
git add CHARTER.md CLAUDE.md README.md
git commit -m "docs: register weaver-crud-recipe in charter, claude guide, and readme

CHARTER §6 확장 포인트 표·CLAUDE.md 스킬 목록·README 프로젝트 구조에
weaver-crud-recipe 골격 스킬을 등록."
```

---

## 완료 기준

- [ ] 5개 커밋 전부 성공 (pre-commit jest 102/102 통과 = 커밋 성공에 내포)
- [ ] `git check-ignore` 검증 2건 통과 (Task 2 Step 5, Task 3 Step 3)
- [ ] Task 4 Step 3 포인터 실재 검증 전부 OK
- [ ] push는 하지 않음 — 주인님 확인 대기
