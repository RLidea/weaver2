import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { RequirePermission } from '../../permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { CategoryService } from '../services/category.service';
import { CategoryDto } from '../dto/category.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@ApiTags('Category')
@Controller({ path: 'boards/:boardId/categories', version: '1' })
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '카테고리 생성 (관리자 전용)' })
  @ApiStandardResponses({ type: CategoryDto })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoryService.create(boardId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: '게시판의 카테고리 목록 조회' })
  @ApiStandardResponses({ type: CategoryDto, isArray: true })
  async findAll(@Param('boardId') boardId: string): Promise<CategoryDto[]> {
    return this.categoryService.findAllByBoardId(boardId);
  }

  @Get(':categoryId')
  @Public()
  @ApiOperation({ summary: '카테고리 단건 조회' })
  @ApiStandardResponses({ type: CategoryDto })
  async findOne(
    @Param('boardId') boardId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<CategoryDto> {
    return this.categoryService.findById(boardId, categoryId);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: '카테고리 수정 (관리자 전용)' })
  @ApiStandardResponses({ type: CategoryDto })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async update(
    @Param('boardId') boardId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoryService.update(boardId, categoryId, dto);
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '카테고리 삭제 (관리자 전용)' })
  @ApiStandardResponses({
    status: 204,
    description: 'Category deleted successfully',
  })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async delete(
    @Param('boardId') boardId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<void> {
    return this.categoryService.delete(boardId, categoryId);
  }
}
