import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UploadService, FileDto, AdminFilesQueryDto } from '@weaver2/upload';
import { ApiKeysetResponse, KeysetResponseDto } from '@weaver2/pagination';

@ApiTags('Admin - Upload')
@Controller({ path: 'admin/upload', version: '1' })
@UseGuards(JwtAuthGuard)
export class UploadAdminController {
  constructor(private readonly uploadService: UploadService) {}

  @Get()
  @RequirePermission(PERMISSIONS.UPLOAD.READ)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '전체 파일 목록 조회 (관리자 전용)',
    description:
      '업로더, 게시글 ID 필터 및 소프트 삭제 포함 여부를 지정할 수 있습니다.',
  })
  @ApiKeysetResponse(FileDto)
  async findAll(
    @Query() query: AdminFilesQueryDto,
  ): Promise<KeysetResponseDto<FileDto>> {
    return this.uploadService.findAllFilesForAdmin(query);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.UPLOAD.DELETE)
  @ApiBearerAuth('ACCESS-TOKEN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '파일 물리 삭제 (관리자 전용)',
    description: '파일과 DB 레코드를 모두 삭제합니다.',
  })
  @ApiStandardResponses({
    status: 204,
    description: 'File hard deleted successfully',
  })
  async hardDelete(@Param('id') id: string): Promise<void> {
    return this.uploadService.hardDeleteFile(id);
  }
}
