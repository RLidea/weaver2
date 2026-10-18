import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UploadService, FileDto, AdminFilesQueryDto } from '@weaver2/upload';
import { ApiKeysetResponse, KeysetResponseDto } from '@weaver2/pagination';

@ApiTags('Admin - Files')
@Controller({ path: 'admin/files', version: '1' })
export class FilesAdminController {
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
    description:
      '글 첨부·프로필에서 떼고 행과 저장소 객체를 지운다. 그 밖(파생 프로젝트의 첨부)에 붙어 있으면 409.',
  })
  @ApiStandardResponses({
    status: 204,
    description: 'File hard deleted successfully',
  })
  async hardDelete(@Param('id') id: string): Promise<void> {
    return this.uploadService.hardDeleteFile(id);
  }
}
