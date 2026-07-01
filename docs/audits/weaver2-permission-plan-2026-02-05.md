# Permission System 구현 계획

> **✅ COMPLETED (2026-05-09)** — 본 계획의 모든 단계가 구현 완료되었습니다.
> RolesGuard 제거, BoardPermission → ResourcePermission 통합, `@RequirePermission` 데코레이터 적용,
> 권한 그룹 시드(SuperAdmin/Admin/Operator/Moderator/User/Suspended), 관리자 그룹 CRUD 모두 동작 중.
> 본 문서의 미체크 체크박스는 *체크 갱신 누락*이며, 실제로는 모두 처리되었습니다.
> 현재 패턴 설명은 [`../README.md`](../../README.md)의 "아키텍처 → 권한 시스템" 절 참조.

---

> 작성일: 2026-02-05
> 최종 수정: 2026-02-06
> 목표: AWS IAM 스타일의 세분화된 권한 시스템 구현

## 설계 요약

### 핵심 구조
```
User → PermissionGroup(들) → Permission 문자열(들)
```

### Permission 표현
- `resource:action` 또는 `resource:action:scope`
- 예: `post:create`, `post:update:own`, `post:delete:all`

### 와일드카드
- `resource:*` → 해당 리소스 전체 권한
- `*:*` → 슈퍼 관리자 (전체 권한)
- `*:action`은 미지원 (필요 시 추후 확장)

### Permission 종류 정의
- **코드에 const로 정의** (DB 테이블 아님)
- 관리자 UI에서 코드에 정의된 목록을 보여주고, 그룹에 할당

### DB 모델
```
PermissionGroup
├── id, name, description, isSystem, createdAt, updatedAt

PermissionGroupPermission
├── id, permissionGroupId, permission (string), createdAt

UserPermissionGroup
├── id, userId, permissionGroupId, createdAt

Post (추가 필드)
├── requiredPermission (string, nullable)

ResourcePermission (리소스별 접근 제어)
├── id, resourceType, resourceId, action, allowAnonymous, createdAt, updatedAt
├── @@unique([resourceType, resourceId, action])

ResourcePermissionAllowedGroup
├── id, resourcePermissionId, permissionGroupId, createdAt

ResourcePermissionDeniedGroup
├── id, resourcePermissionId, permissionGroupId, createdAt
```

### ResourcePermission 동작 원리
- **규칙 없음** → 기본 거부
- **allowAnonymous: true + allowedGroups 비어있음** → public (누구나 접근)
- **allowAnonymous: false + allowedGroups 비어있음** → 로그인만 하면 허용
- **deniedGroups 우선** → allowedGroups보다 먼저 체크

### 성능 전략
- 인메모리 LRU 캐시 (TTL + 최대 크기 제한) → 추후 Redis 전환 가능
- 로그인 시 or 첫 요청 시 DB 조회 → 캐시 저장
- 권한 변경 시 해당 유저 캐시 무효화

### 환경변수 설정
```
PERMISSION_CACHE_STRATEGY=memory  # memory | none
PERMISSION_CACHE_TTL=300          # 초 (기본 5분)
PERMISSION_CACHE_MAX_SIZE=1000    # 최대 캐시 유저 수
```

### 와일드카드 체크 로직
```
hasPermission('post:create') 체크 순서:
1. '*:*' 있나? → 슈퍼 관리자
2. 'post:*' 있나? → 리소스 와일드카드
3. 'post:create' 있나? → 정확한 매칭
```

---

## 구현 단계

### 1단계: 기반 작업

- [x] 1-1. Permission 상수 정의 (`permissions.const.ts`)
  - resource:action 문자열 상수 전체 정의
  - POST, COMMENT, USER, BOARD, ADMIN 등

- [x] 1-2. Prisma 스키마 수정 (`schema.prisma`)
  - PermissionGroup, PermissionGroupPermission, UserPermissionGroup 모델 추가
  - Post에 requiredPermission 필드 추가
  - FK 컬럼명 규칙: `{참조테이블명}Id` 적용

- [x] 1-3. 마이그레이션 생성 및 적용

### 2단계: 핵심 서비스

- [x] 2-1. PermissionService 구현
  - 유저 권한 로드 (DB → 캐시)
  - hasPermission() 체크 로직 (와일드카드 포함)
  - LRU 캐시 (TTL + 최대 크기 제한)
  - 환경변수로 캐시 전략 설정 가능

- [x] 2-2. PermissionGuard + @RequirePermission 데코레이터 구현
  - 기존 RolesGuard 대체

- [x] 2-3. ResourcePermission 구현
  - ResourcePermission, ResourcePermissionAllowedGroup, ResourcePermissionDeniedGroup 모델 추가
  - 관계 테이블로 FK 무결성 보장
  - hasResourcePermission() 메서드 구현
  - 규칙 없으면 기본 거부, public은 allowAnonymous + 빈 allowedGroups로 설정

### 3단계: 기존 시스템 교체

- [ ] 3-1. 기존 RolesGuard / @Roles 데코레이터 제거

- [ ] 3-2. 기존 BoardPermission 통합
  - BoardPermission 테이블/로직을 새 시스템으로 흡수

- [ ] 3-3. 컨트롤러 전환
  - @Roles(Role.ADMIN) → @RequirePermission('admin:access') 등으로 변경

### 4단계: 관리 기능

- [ ] 4-1. 시드 데이터 (`permission-group.seed.ts`)
  - 기본 그룹: 슈퍼관리자, 일반사용자, 콘텐츠관리자 등

- [ ] 4-2. 관리자 API
  - 그룹 CRUD
  - 그룹에 권한 할당/해제
  - 유저에 그룹 할당/해제
