---
name: weaver-coding-standards
description: Weaver2 project coding standards including ApiClient patterns, NestJS conventions, TypeScript rules, and database naming standards. Apply when writing backend code, services, controllers, or database migrations.
license: UNLICENSED
metadata:
  author: Weaver2 Team
  version: "1.0.0"
  project: weaver2
---

# Weaver2 Coding Standards

프로젝트 특화 코딩 표준 및 패턴 가이드

## When to Apply

이 규칙은 다음 상황에서 적용:
- NestJS 백엔드 코드 작성 (controllers, services, modules)
- API 엔드포인트 구현
- 데이터베이스 마이그레이션 작성
- 코드 리뷰 및 리팩토링

## 🔴 CRITICAL - API 패턴

### ApiClient 필수 사용

**규칙:** 프론트엔드에서 `fetch()` 직접 사용 금지

**올바른 패턴:**
```typescript
// ✅ CORRECT
import { waitForApiClient } from '@/lib/api-client';

async function fetchUsers() {
  const apiClient = await waitForApiClient();
  const response = await apiClient.get('/api/users');
  return response.data;
}
```

**금지 패턴:**
```typescript
// ❌ WRONG
const response = await fetch('/api/users');
```

**이유:**
- 중앙화된 에러 처리
- 인증 토큰 자동 관리
- 인터셉터/로깅 일관성

---

## 🔴 CRITICAL - 데이터베이스

### 테이블명 규칙

**규칙:** Prisma 모델명은 PascalCase

```prisma
// ✅ CORRECT
model User {
  id String @id
}

model UserProfile {
  id String @id
}

// ❌ WRONG
model user_profile {
  id String @id
}
```

### Migration 실행

**규칙:** Migration 파일 생성만, 실행은 사용자가 직접

```bash
# Claude가 할 수 있는 것
prisma migrate dev --name add_user_field --create-only

# 사용자가 직접 실행
prisma migrate dev
```

---

## 🟡 HIGH - 코딩 스타일

### 약어 금지

**규칙:** 변수명에 약어 사용 금지

```typescript
// ✅ CORRECT
const errorMessage = 'Failed';
const userRepository = new UserRepository();

// ❌ WRONG
const errMsg = 'Failed';
const userRepo = new UserRepository();
```

### TypeScript 엄격 모드

**규칙:**
- `any` 타입 사용 금지
- 명시적 타입 선언
- null/undefined 체크

```typescript
// ✅ CORRECT
interface UserDto {
  id: string;
  name: string;
}

function getUser(id: string): Promise<UserDto | null> {
  // ...
}

// ❌ WRONG
function getUser(id: any): any {
  // ...
}
```

### ESLint/Prettier 준수

**규칙:** 모든 코드는 ESLint 통과 필수

```bash
# 코드 작성 후 반드시 실행
npm run lint
```

---

## 🟡 HIGH - NestJS 패턴

### 생성자 주입 우선

```typescript
// ✅ CORRECT
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}
}

// ❌ WRONG
@Injectable()
export class UserService {
  @Inject(PrismaService)
  prisma: PrismaService;
}
```

### DTO 사용

```typescript
// ✅ CORRECT
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;
}

@Post()
create(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}
```

---

## 🟢 MEDIUM - 프로젝트 관습

### 시드 로거 사용

**규칙:** 데이터베이스 시드 시 `seed-logger.ts` 사용

```typescript
import { logger } from './seed-logger';

logger.info('Creating users...');
logger.success('Users created!');
logger.error('Failed to create users');
```

### 파일 구조 일관성

```
features/
  └── user/
      ├── controllers/
      │   └── user-profile.controller.ts
      ├── services/
      │   └── find-user.service.ts
      ├── repositories/
      │   └── find-user.query.ts
      └── user.module.ts
```

---

## 체크리스트

코드 작성 전 확인:
- [ ] ApiClient 사용 (fetch 금지)
- [ ] 테이블명 PascalCase
- [ ] 약어 미사용
- [ ] TypeScript 엄격 모드 준수
- [ ] ESLint 통과
- [ ] 생성자 주입 사용
- [ ] DTO 정의 및 validation

---

## 참고

이 규칙은 `/CLAUDE.md`의 프로젝트 규칙을 상세화한 것입니다.
워크플로우 및 금지 사항은 CLAUDE.md 참조.
