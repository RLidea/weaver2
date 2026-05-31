# Banner 모듈 백엔드 구현 계획 (Plan 1 / 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** weaver2에 self-contained한 banner(배너/팝업) 백엔드 모듈을 board와 동일한 NestJS CQRS 패턴으로 구현하고, FeatureManifest까지 등록한다.

**Architecture:** `features/banner/`에 controller(공개 1 + 관리 1) / service / 함수형 repository(command·query) / dto를 두고, `banner.module.ts`로 묶어 `core.module.ts`·`admin-api.module.ts`에 등록한다. 권한은 `libs/shared`에 정의, prisma 모델은 분리 스키마 파일로 둔다. banner는 **아무 모듈도 import하지 않는** self-contained 구조(인바운드 의존 0)로, upload는 `imageFileId` 문자열만 보관해 코드 의존을 만들지 않는다(soft).

**Tech Stack:** NestJS, Prisma, class-validator, @nestjs/swagger, pnpm 모노레포, jest.

> **설계 메모 (스펙 대비 변경):** 스펙(`2026-05-31-module-banner-poc.md`)은 `dependsOn: upload(hard)`로 적었으나, banner backend가 upload를 코드 import하지 않으므로 **upload는 soft**가 정확하다. 이미지 업로드는 프론트(Plan 2)가 upload API를 호출하고 banner는 반환된 `imageFileId`만 저장한다. 이 계획은 그 결정을 반영한다.

---

## 파일 구조 (이 계획에서 생성/수정)

**생성:**
- `apps/core-backend/prisma/schema/banner.prisma` — Banner 모델 + BannerSlot enum
- `apps/core-backend/src/features/banner/banner.module.ts`
- `apps/core-backend/src/features/banner/banner.feature.ts` — FeatureManifest
- `apps/core-backend/src/features/banner/controllers/banner.controller.ts` — 공개 조회
- `apps/core-backend/src/features/banner/controllers/banner-admin.controller.ts` — 관리 CRUD
- `apps/core-backend/src/features/banner/services/banner.service.ts`
- `apps/core-backend/src/features/banner/services/banner.service.spec.ts`
- `apps/core-backend/src/features/banner/repositories/create-banner.command.ts`
- `apps/core-backend/src/features/banner/repositories/update-banner.command.ts`
- `apps/core-backend/src/features/banner/repositories/soft-delete-banner.command.ts`
- `apps/core-backend/src/features/banner/repositories/find-banner-by-id.query.ts`
- `apps/core-backend/src/features/banner/repositories/find-all-banners.query.ts`
- `apps/core-backend/src/features/banner/repositories/find-active-banners-by-slot.query.ts`
- `apps/core-backend/src/features/banner/dto/banner.dto.ts`
- `apps/core-backend/src/features/banner/dto/create-banner.dto.ts`
- `apps/core-backend/src/features/banner/dto/update-banner.dto.ts`
- `apps/core-backend/src/features/banner/dto/find-banners.query.dto.ts`
- `apps/core-backend/prisma/seed/banner-permission.seed.ts`

**수정:**
- `apps/core-backend/prisma/schema/auth.prisma` — User 모델에 `banners Banner[]` backref
- `libs/shared/src/index.ts` — `PERMISSIONS.BANNER`
- `libs/common/src/constants/permissions.const.ts` — banner 권한 카탈로그
- `apps/core-backend/src/features/manifests.ts` — `bannerFeature` 등록
- `apps/core-backend/src/core.module.ts` — `BannerModule` 등록
- `apps/core-backend/src/system/admin/api/admin-api.module.ts` — `BannerModule` 등록
- `apps/core-backend/prisma/seed/permission-group.seed.ts` — Admin 그룹에 `PERMISSIONS.BANNER.ALL`
- `apps/core-backend/prisma/seed/seed.ts` — `seedBannerPermissions` 호출

> 구현 전 `apps/core-backend/src/features/board/controllers/board.controller.ts`의 가드 스택(`@UseGuards(...)` 정확한 조합)과 `post-admin.controller.ts`의 관리 컨트롤러 패턴을 1회 확인하고 동일하게 맞춘다. 아래 코드는 board.controller 기준이며, 글로벌 PermissionGuard가 없다면 admin 컨트롤러 `@UseGuards`에 PermissionGuard를 추가한다.

---

## Task 1: Prisma Banner 모델 + enum

**Files:**
- Create: `apps/core-backend/prisma/schema/banner.prisma`
- Modify: `apps/core-backend/prisma/schema/auth.prisma` (User 모델)

- [ ] **Step 1: banner.prisma 작성**

```prisma
// =============================================================================
// Project: Banner Feature
// =============================================================================

model Banner {
  id          String     @id @default(uuid())
  title       String
  imageFileId String
  linkUrl     String?
  slot        BannerSlot @default(MAIN_TOP)
  isActive    Boolean    @default(true)
  sortOrder   Int        @default(0)
  startsAt    DateTime?
  endsAt      DateTime?
  createdById String?
  createdBy   User?      @relation(fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?

  @@index([slot, isActive, sortOrder], map: "banner_slot_idx")
  @@map("banners")
}

enum BannerSlot {
  MAIN_TOP
  MAIN_BOTTOM
  SIDEBAR
  POPUP
}
```

- [ ] **Step 2: auth.prisma User 모델에 backref 추가**

`model User { ... }` 안의 관계 필드 목록(예: `posts Post[]` 근처)에 한 줄 추가:

```prisma
  banners   Banner[]
```

- [ ] **Step 3: Prisma client 생성 + 마이그레이션**

Run: `pnpm --filter @weaver2/core-backend exec prisma generate`
Expected: 에러 없이 generate 완료 (Banner, BannerSlot 타입 생성)

Run: `pnpm --filter @weaver2/core-backend exec prisma migrate dev --name add_banner`
Expected: `banners` 테이블 생성 마이그레이션 적용 성공

> 정확한 prisma 실행 스크립트는 `apps/core-backend/package.json`의 db 관련 script(예: `db:core:migrate`)를 확인해 그것을 사용한다. 없으면 위 `--filter` 방식.

- [ ] **Step 4: Commit**

```bash
git add apps/core-backend/prisma/
git commit -m "feat(banner): add Banner prisma model and migration"
```

---

## Task 2: 권한 상수 정의

**Files:**
- Modify: `libs/shared/src/index.ts`
- Modify: `libs/common/src/constants/permissions.const.ts`

- [ ] **Step 1: libs/shared PERMISSIONS에 BANNER 추가**

`PERMISSIONS` 객체의 `BOARD: { ... }` 정의 바로 아래에 추가:

```typescript
  /** 배너/팝업 */
  BANNER: {
    READ: 'banner:read',
    MANAGE: 'banner:manage',
    ALL: 'banner:*',
  },
```

- [ ] **Step 2: libs/common 권한 카탈로그에 추가**

`ALL_PERMISSIONS`(또는 동등 배열)에서 board 항목들 아래에 추가:

```typescript
  { value: 'banner:read', label: '배너 조회' },
  { value: 'banner:manage', label: '배너 관리' },
  { value: 'banner:*', label: '배너 전체 권한' },
```

- [ ] **Step 3: 타입체크**

Run: `pnpm --filter @weaver2/shared build` (또는 루트 `pnpm -w typecheck`)
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add libs/shared libs/common
git commit -m "feat(banner): add BANNER permission constants"
```

---

## Task 3: DTO 작성

**Files:**
- Create: `apps/core-backend/src/features/banner/dto/banner.dto.ts`
- Create: `apps/core-backend/src/features/banner/dto/create-banner.dto.ts`
- Create: `apps/core-backend/src/features/banner/dto/update-banner.dto.ts`
- Create: `apps/core-backend/src/features/banner/dto/find-banners.query.dto.ts`

- [ ] **Step 1: banner.dto.ts (응답 DTO + 정적 매퍼)**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Banner, BannerSlot } from '@prisma/client';

export class BannerDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() imageFileId: string;
  @ApiPropertyOptional({ nullable: true }) linkUrl: string | null;
  @ApiProperty({ enum: ['MAIN_TOP', 'MAIN_BOTTOM', 'SIDEBAR', 'POPUP'] })
  slot: BannerSlot;
  @ApiProperty() isActive: boolean;
  @ApiProperty() sortOrder: number;
  @ApiPropertyOptional({ nullable: true }) startsAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) endsAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) createdById: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(entity: Banner): BannerDto {
    const dto = new BannerDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.imageFileId = entity.imageFileId;
    dto.linkUrl = entity.linkUrl;
    dto.slot = entity.slot;
    dto.isActive = entity.isActive;
    dto.sortOrder = entity.sortOrder;
    dto.startsAt = entity.startsAt;
    dto.endsAt = entity.endsAt;
    dto.createdById = entity.createdById;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
```

- [ ] **Step 2: create-banner.dto.ts**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsDateString, Min,
} from 'class-validator';
import { BannerSlot } from '@prisma/client';

export class CreateBannerDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() imageFileId: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() linkUrl?: string;
  @ApiProperty({ enum: BannerSlot }) @IsEnum(BannerSlot) slot: BannerSlot;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
}
```

- [ ] **Step 3: update-banner.dto.ts**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateBannerDto } from './create-banner.dto';

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}
```

- [ ] **Step 4: find-banners.query.dto.ts (공개 조회 쿼리)**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BannerSlot } from '@prisma/client';

export class FindBannersQueryDto {
  @ApiPropertyOptional({ enum: BannerSlot })
  @IsOptional()
  @IsEnum(BannerSlot)
  slot?: BannerSlot;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/core-backend/src/features/banner/dto
git commit -m "feat(banner): add banner DTOs"
```

---

## Task 4: 함수형 repository (command / query)

**Files:**
- Create: 6개 repository 파일 (위 파일 구조 참조)

- [ ] **Step 1: create-banner.command.ts**

```typescript
import type { PrismaClient, Prisma } from '@prisma/client';

export async function CreateBannerCommand(
  prisma: PrismaClient,
  data: Prisma.BannerUncheckedCreateInput,
) {
  return prisma.banner.create({ data });
}
```

- [ ] **Step 2: update-banner.command.ts**

```typescript
import type { PrismaClient, Prisma } from '@prisma/client';

export async function UpdateBannerCommand(
  prisma: PrismaClient,
  id: string,
  data: Prisma.BannerUpdateInput,
) {
  return prisma.banner.update({ where: { id }, data });
}
```

- [ ] **Step 3: soft-delete-banner.command.ts**

```typescript
import type { PrismaClient } from '@prisma/client';

export async function SoftDeleteBannerCommand(prisma: PrismaClient, id: string) {
  return prisma.banner.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

- [ ] **Step 4: find-banner-by-id.query.ts**

```typescript
import type { PrismaClient } from '@prisma/client';

export async function FindBannerByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.banner.findFirst({ where: { id, deletedAt: null } });
}
```

- [ ] **Step 5: find-all-banners.query.ts (관리자 목록)**

```typescript
import type { PrismaClient } from '@prisma/client';

export async function FindAllBannersQuery(prisma: PrismaClient) {
  return prisma.banner.findMany({
    where: { deletedAt: null },
    orderBy: [{ slot: 'asc' }, { sortOrder: 'asc' }],
  });
}
```

- [ ] **Step 6: find-active-banners-by-slot.query.ts (공개 노출)**

```typescript
import type { PrismaClient, BannerSlot } from '@prisma/client';

export async function FindActiveBannersBySlotQuery(
  prisma: PrismaClient,
  slot: BannerSlot | undefined,
  now: Date,
) {
  return prisma.banner.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(slot ? { slot } : {}),
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: 'asc' },
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/core-backend/src/features/banner/repositories
git commit -m "feat(banner): add banner command/query repositories"
```

---

## Task 5: BannerService (TDD — 활성 필터 로직)

**Files:**
- Create: `apps/core-backend/src/features/banner/services/banner.service.ts`
- Test: `apps/core-backend/src/features/banner/services/banner.service.spec.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`banner.service.spec.ts` — `findActiveBySlot`가 query 함수에 올바른 `now`/`slot`을 넘기고 결과를 DTO로 매핑하는지 검증:

```typescript
import { Test } from '@nestjs/testing';
import { PrismaService } from '@weaver2/prisma';
import { BannerService } from './banner.service';

describe('BannerService', () => {
  let service: BannerService;
  let prisma: { banner: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      banner: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [BannerService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BannerService);
  });

  it('findActiveBySlot: 활성·기간 필터로 조회해 DTO 배열을 반환한다', async () => {
    const row = {
      id: 'b1', title: '여름 이벤트', imageFileId: 'f1', linkUrl: null,
      slot: 'MAIN_TOP', isActive: true, sortOrder: 0,
      startsAt: null, endsAt: null, createdById: 'u1',
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    };
    prisma.banner.findMany.mockResolvedValue([row]);

    const result = await service.findActiveBySlot('MAIN_TOP');

    expect(prisma.banner.findMany).toHaveBeenCalledTimes(1);
    const args = (prisma.banner.findMany.mock.calls as [{ where: Record<string, unknown> }][])[0][0];
    expect(args.where).toMatchObject({ deletedAt: null, isActive: true, slot: 'MAIN_TOP' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
    expect(result[0]).not.toHaveProperty('deletedAt'); // DTO 매핑 확인
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm --filter @weaver2/core-backend exec jest banner.service.spec --config apps/core-backend/jest.config.js`
Expected: FAIL — `BannerService`를 찾을 수 없음 / 모듈 없음

> 정확한 jest 실행은 `sh scripts/run-test.sh` 또는 `apps/core-backend/jest.config.js`를 참조.

- [ ] **Step 3: BannerService 구현**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import type { BannerSlot } from '@prisma/client';
import { BannerDto } from '../dto/banner.dto';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';
import { CreateBannerCommand } from '../repositories/create-banner.command';
import { UpdateBannerCommand } from '../repositories/update-banner.command';
import { SoftDeleteBannerCommand } from '../repositories/soft-delete-banner.command';
import { FindBannerByIdQuery } from '../repositories/find-banner-by-id.query';
import { FindAllBannersQuery } from '../repositories/find-all-banners.query';
import { FindActiveBannersBySlotQuery } from '../repositories/find-active-banners-by-slot.query';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveBySlot(slot?: BannerSlot): Promise<BannerDto[]> {
    const rows = await FindActiveBannersBySlotQuery(this.prisma, slot, new Date());
    return rows.map(BannerDto.from);
  }

  async findAll(): Promise<BannerDto[]> {
    const rows = await FindAllBannersQuery(this.prisma);
    return rows.map(BannerDto.from);
  }

  async findOne(id: string): Promise<BannerDto> {
    const row = await FindBannerByIdQuery(this.prisma, id);
    if (!row) throw new NotFoundException('Banner not found');
    return BannerDto.from(row);
  }

  async create(dto: CreateBannerDto, createdById: string): Promise<BannerDto> {
    const row = await CreateBannerCommand(this.prisma, {
      title: dto.title,
      imageFileId: dto.imageFileId,
      linkUrl: dto.linkUrl ?? null,
      slot: dto.slot,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      createdById,
    });
    return BannerDto.from(row);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerDto> {
    await this.findOne(id); // 존재 확인 (404)
    const row = await UpdateBannerCommand(this.prisma, id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.imageFileId !== undefined ? { imageFileId: dto.imageFileId } : {}),
      ...(dto.linkUrl !== undefined ? { linkUrl: dto.linkUrl } : {}),
      ...(dto.slot !== undefined ? { slot: dto.slot } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
    });
    return BannerDto.from(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 존재 확인 (404)
    await SoftDeleteBannerCommand(this.prisma, id);
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `pnpm --filter @weaver2/core-backend exec jest banner.service.spec --config apps/core-backend/jest.config.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add apps/core-backend/src/features/banner/services
git commit -m "feat(banner): add BannerService with active-slot filtering"
```

---

## Task 6: 컨트롤러 (공개 + 관리)

**Files:**
- Create: `apps/core-backend/src/features/banner/controllers/banner.controller.ts`
- Create: `apps/core-backend/src/features/banner/controllers/banner-admin.controller.ts`

> 구현 전 `board.controller.ts`와 `post-admin.controller.ts`를 열어 정확한 import 경로(`RequirePermission`, `JwtAuthGuard`, `@ApiStandardResponses`/`ApiTags`)와 가드 스택을 확인하고 동일하게 맞춘다. 인증된 사용자 id 추출 데코레이터(예: `@CurrentUser()` 또는 `@Req()`) 역시 board 관리 컨트롤러에서 쓰는 방식을 그대로 복제한다.

- [ ] **Step 1: banner.controller.ts (공개 조회 — `@Public()` 필수)**

> ⚠️ JwtAuthGuard가 글로벌 `APP_GUARD`(auth.module)로 등록돼 있다. 가드 데코레이터를 안 붙여도 글로벌 가드가 적용되어 401이 난다. 공개 엔드포인트는 **`@Public()` 데코레이터**(`@weaver2/common/decorator/public.decorator`)로 우회해야 한다(board의 post.controller 공개 GET 패턴).

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { BannerService } from '../services/banner.service';
import { BannerDto } from '../dto/banner.dto';
import { FindBannersQueryDto } from '../dto/find-banners.query.dto';

@ApiTags('Banner')
@Controller({ path: 'banners', version: '1' })
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '활성 배너 조회 (슬롯별 필터 가능)' })
  @ApiStandardResponses({ type: BannerDto, isArray: true })
  async findActive(@Query() query: FindBannersQueryDto): Promise<BannerDto[]> {
    return this.bannerService.findActiveBySlot(query.slot);
  }
}
```

- [ ] **Step 2: banner-admin.controller.ts (관리 CRUD — banner:manage)**

`@CurrentUser()`/userId 추출은 board 관리 컨트롤러 패턴으로 교체할 것:

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { PERMISSIONS } from '@weaver2/shared';
import { BannerService } from '../services/banner.service';
import { BannerDto } from '../dto/banner.dto';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';

@ApiTags('Banner Admin')
@Controller({ path: 'admin/banners', version: '1' })
@UseGuards(JwtAuthGuard)
export class BannerAdminController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  async findAll(): Promise<BannerDto[]> {
    return this.bannerService.findAll();
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  async findOne(@Param('id') id: string): Promise<BannerDto> {
    return this.bannerService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  async create(
    @Body() dto: CreateBannerDto,
    @CurrentUser('id') userId: string,
  ): Promise<BannerDto> {
    return this.bannerService.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto): Promise<BannerDto> {
    return this.bannerService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.BANNER.MANAGE)
  async remove(@Param('id') id: string): Promise<void> {
    return this.bannerService.remove(id);
  }
}
```

> import 경로(`guards/jwt-auth.guard`, `decorators/require-permission.decorator`, `decorators/current-user.decorator`)는 board 컨트롤러의 실제 경로로 교정한다. `@CurrentUser('id')`가 없으면 board가 쓰는 방식(예: `@Req() req` 후 `req.user.id`)으로 대체.

- [ ] **Step 3: 타입체크**

Run: `pnpm -w typecheck` (또는 `pnpm --filter @weaver2/core-backend exec tsc --noEmit`)
Expected: 에러 없음 (BannerModule 미등록이라 런타임 아닌 타입만)

- [ ] **Step 4: Commit**

```bash
git add apps/core-backend/src/features/banner/controllers
git commit -m "feat(banner): add public and admin banner controllers"
```

---

## Task 7: BannerModule

**Files:**
- Create: `apps/core-backend/src/features/banner/banner.module.ts`

- [ ] **Step 1: 모듈 작성**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { BannerController } from './controllers/banner.controller';
import { BannerAdminController } from './controllers/banner-admin.controller';
import { BannerService } from './services/banner.service';

@Module({
  imports: [PrismaModule],
  controllers: [BannerController, BannerAdminController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
```

> `PrismaModule` import 경로는 board.module.ts에서 확인(`@weaver2/prisma` 또는 상대경로).

- [ ] **Step 2: Commit**

```bash
git add apps/core-backend/src/features/banner/banner.module.ts
git commit -m "feat(banner): add BannerModule"
```

---

## Task 8: FeatureManifest + manifests 등록

**Files:**
- Create: `apps/core-backend/src/features/banner/banner.feature.ts`
- Modify: `apps/core-backend/src/features/manifests.ts`

- [ ] **Step 1: banner.feature.ts**

```typescript
import type { FeatureManifest } from '@weaver2/module-registry';

export const bannerFeature: FeatureManifest = {
  id: 'banner',
  layer: 'features',
  description: '배너/팝업 — 슬롯별 노출, 게시기간, 활성토글, 정렬. self-contained(인바운드 의존 0)',

  // backend는 auth+permission만 코드 의존. upload는 import하지 않으므로 dependsOn 미포함
  // (manifest-extract.spec이 추출 결과와 대조하므로 코드 의존만 적어야 한다).
  dependsOn: [
    { id: 'auth', kind: 'hard', reason: 'JwtAuthGuard 사용 (관리 컨트롤러 인증)' },
    { id: 'permission', kind: 'hard', reason: 'RequirePermission(BANNER.MANAGE) 데코레이터' },
  ],

  footprint: {
    backendDir: 'apps/core-backend/src/features/banner',
    frontendDirs: [
      'apps/core-frontend/src/features/banner',
      'apps/core-frontend/src/features/admin/banners',
    ],
    prismaSchema: 'apps/core-backend/prisma/schema/banner.prisma',
    prismaModels: ['Banner'],
    coreBackrefs: ['User.banners'],
    permissions: ['PERMISSIONS.BANNER'],
    seeds: ['apps/core-backend/prisma/seed/banner-permission.seed.ts'],
    routes: ['apps/core-frontend/src/app/(admin)/admin/banners'],
    pinpoints: [
      'apps/core-backend/src/core.module.ts → BannerModule',
      'apps/core-backend/src/system/admin/api/admin-api.module.ts → BannerModule',
      'apps/core-frontend/src/proxy.ts → /banners',
      'apps/core-backend/prisma/seed/permission-group.seed.ts → PERMISSIONS.BANNER.*',
      'libs/shared/src/index.ts → PERMISSIONS.BANNER',
      'libs/common/src/constants/permissions.const.ts → banner:manage',
    ],
  },

  removalNotes: [],
};
```

- [ ] **Step 2: manifests.ts에 등록**

```typescript
import { bannerFeature } from './banner/banner.feature';
```
그리고 `ALL_MANIFESTS` 배열에 `bannerFeature,` 추가.

- [ ] **Step 3: manifest 테스트 통과 확인**

Run: `pnpm --filter @weaver2/core-backend exec jest manifests.spec --config apps/core-backend/jest.config.js`
Expected: PASS (banner 매니페스트 포함, 의존성 그래프 정상 빌드)

- [ ] **Step 4: Commit**

```bash
git add apps/core-backend/src/features/banner/banner.feature.ts apps/core-backend/src/features/manifests.ts
git commit -m "feat(banner): add FeatureManifest and register in manifests"
```

---

## Task 9: 모듈 등록 (core + admin-api)

**Files:**
- Modify: `apps/core-backend/src/core.module.ts`
- Modify: `apps/core-backend/src/system/admin/api/admin-api.module.ts`

- [ ] **Step 1: core.module.ts**

상단 import 추가:
```typescript
import { BannerModule } from './features/banner/banner.module';
```
`@Module({ imports: [...] })`의 `BoardModule` 근처에 `BannerModule,` 추가.

- [ ] **Step 2: admin-api.module.ts**

상단 import 추가:
```typescript
import { BannerModule } from '../../../features/banner/banner.module';
```
`imports: [PrismaModule, BoardModule, ...]` 배열에 `BannerModule,` 추가.

- [ ] **Step 3: 빌드 검증**

Run: `pnpm --filter @weaver2/core-backend build`
Expected: nest build 성공 (BannerModule 등록, 컨트롤러 매핑)

- [ ] **Step 4: Commit**

```bash
git add apps/core-backend/src/core.module.ts apps/core-backend/src/system/admin/api/admin-api.module.ts
git commit -m "feat(banner): register BannerModule in core and admin-api modules"
```

---

## Task 10: 시드 (권한 그룹 매핑 + banner 시드)

**Files:**
- Create: `apps/core-backend/prisma/seed/banner-permission.seed.ts`
- Modify: `apps/core-backend/prisma/seed/permission-group.seed.ts`
- Modify: `apps/core-backend/prisma/seed/seed.ts`

> banner는 board와 달리 리소스별 ResourcePermission이 없다(전역 권한). 따라서 banner 시드는 "기본 권한 그룹에 banner 권한이 포함되도록 보장"하는 가벼운 멱등 시드로 둔다. 권한 그룹 자체의 권한 배열은 `permission-group.seed.ts`에서 관리하므로, banner-permission.seed.ts는 footprint `seeds` 슬롯을 채우는 용도 + 향후 샘플 데이터 자리로 둔다.

- [ ] **Step 1: permission-group.seed.ts — Admin/Operator 그룹에 BANNER 추가**

`permissionGroupsToSeed`의 Admin 그룹 `permissions` 배열에 추가:
```typescript
      PERMISSIONS.BANNER.ALL,
```
(board가 들어간 그룹과 동일한 그룹들에 맞춰 배치)

- [ ] **Step 2: banner-permission.seed.ts (멱등 no-op + 로그)**

```typescript
import type { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

/**
 * Banner 모듈 시드.
 * banner는 전역 권한(banner:manage)만 사용하며 리소스별 권한이 없다.
 * 권한 그룹 매핑은 permission-group.seed.ts가 담당한다.
 * 이 시드는 footprint seeds 슬롯을 채우고, 향후 샘플 배너 데이터 자리로 둔다.
 */
export async function seedBannerPermissions(_prisma: PrismaClient): Promise<void> {
  logSeedResult('Banner', 'permission groups (via permission-group.seed)', 'exists');
}
```

> `logSeedResult`의 시그니처는 board-permission.seed.ts에서 확인해 정확히 맞춘다.

- [ ] **Step 3: seed.ts에서 호출 추가**

`seed.ts` 진입점에서 board 시드 호출 근처에 추가:
```typescript
import { seedBannerPermissions } from './banner-permission.seed';
// ...
await seedBannerPermissions(prisma);
```

- [ ] **Step 4: 시드 실행 검증**

Run: `pnpm --filter @weaver2/core-backend exec prisma db seed`
Expected: 에러 없이 완료, Admin 그룹에 banner 권한 반영

- [ ] **Step 5: Commit**

```bash
git add apps/core-backend/prisma/seed
git commit -m "feat(banner): add banner seed and permission-group mapping"
```

---

## Task 11: 통합 검증

- [ ] **Step 1: 전체 타입체크 + 빌드**

Run: `pnpm -w typecheck && pnpm --filter @weaver2/core-backend build`
Expected: 모두 통과

- [ ] **Step 2: 전체 테스트**

Run: `sh scripts/run-test.sh test`
Expected: 기존 통과 테스트 + banner.service.spec PASS, 회귀 없음

- [ ] **Step 3: 수동 API 검증 (서버는 사용자가 띄움 — dev 서버 직접 실행 금지)**

사용자에게 다음 검증을 요청:
1. 관리자 토큰으로 `POST /v1/admin/banners` (title, imageFileId, slot=MAIN_TOP) → 201 + BannerDto
2. `GET /v1/banners?slot=MAIN_TOP` → 방금 만든 활성 배너 1건 (deletedAt/createdBy 내부필드 미노출 확인)
3. `PATCH /v1/admin/banners/:id` (isActive=false) → `GET /v1/banners?slot=MAIN_TOP` 결과에서 사라짐
4. `DELETE /v1/admin/banners/:id` → 204, 목록에서 soft-delete 확인
5. 권한 없는 토큰으로 admin 엔드포인트 → 403

- [ ] **Step 4: 최종 확인**

`GET /v1/admin/modules`(대시보드 매니페스트 API)에 banner 노드가 의존성 그래프와 함께 나타나는지 확인.

---

## Self-Review 결과

- **Spec 커버리지:** 데이터 모델(Task 1)·권한(Task 2)·DTO(Task 3)·CQRS(Task 4·5)·API(Task 6)·모듈/매니페스트/등록(Task 7·8·9)·시드(Task 10)·footprint(Task 8) — 스펙 4~8절 모두 태스크 존재. 프론트(7절)·라이프사이클(9~12절)은 Plan 2·3로 분리.
- **스펙 대비 변경:** upload `hard→soft` (banner backend 미import). 본 계획·매니페스트(Task 8)에 반영. 스펙 문서도 후속 업데이트 권장.
- **타입 일관성:** `BannerDto.from`, `findActiveBySlot(slot?)`, command/query 함수 시그니처가 service·controller·test에서 일관.
- **미확정(구현 시 1회 확인):** ① prisma 마이그레이션 스크립트명 ② board 컨트롤러의 정확한 가드/데코레이터 import 경로 및 userId 추출 방식 ③ `logSeedResult` 시그니처. 각 태스크에 확인 노트 명시됨.

---

## 다음 단계

- Plan 1 완료 후 → **Plan 2 (banner frontend)** 작성: 그 시점에 board admin 컴포넌트 실제 코드를 탐색해 완전한 프론트 코드 포함.
- 이후 → **Plan 3 (Phase 2 라이프사이클)**: extract/codegen/remove/add 스크립트.
