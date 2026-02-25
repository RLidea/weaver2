import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Redirect,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../features/auth/guards/jwt-auth.guard';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UploadService, FileDto, UploadFileDto } from '@weaver2/upload';
import { SystemSettingService } from '../../config/system-setting.service';
import { memoryStorage } from 'multer';

@ApiTags('Upload')
@Controller({ path: 'upload', version: '1' })
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly systemSettingService: SystemSettingService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '파일 업로드 (최대 10개)',
    description:
      'multipart/form-data로 최대 10개의 파일을 업로드합니다. postId를 지정하면 게시글과 연결됩니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiStandardResponses({ type: FileDto, isArray: true })
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query() dto: UploadFileDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<FileDto[]> {
    const settings = await this.systemSettingService.getAll();

    return this.uploadService.uploadFiles(files, authUser?.id, {
      postId: dto.postId,
      maxFileSize: settings.uploadMaxFileSize,
      allowedMimeTypes: settings.uploadAllowedMimeTypes,
      thumbnailWidth: settings.uploadThumbnailWidth,
      thumbnailHeight: settings.uploadThumbnailHeight,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '파일 메타데이터 조회' })
  @ApiStandardResponses({ type: FileDto })
  async getFileById(@Param('id') id: string): Promise<FileDto> {
    return this.uploadService.findFileById(id);
  }

  @Get(':id/file')
  @Redirect()
  @ApiOperation({
    summary: '파일 서빙 (302 리다이렉트)',
    description:
      'local: 정적 경로로 리다이렉트, s3: presigned URL로 리다이렉트',
  })
  async serveFile(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.uploadService.getFileUrl(id);
    return { url };
  }

  @Get(':id/thumbnail')
  @Redirect()
  @ApiOperation({
    summary: '썸네일 서빙 (302 리다이렉트)',
    description: '이미지가 아니거나 썸네일이 없으면 404',
  })
  async serveThumbnail(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.uploadService.getThumbnailUrl(id);
    if (!url) throw new NotFoundException('썸네일이 없습니다.');
    return { url };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '파일 소프트 삭제 (본인 파일만)' })
  @ApiStandardResponses({
    status: 204,
    description: 'File deleted successfully',
  })
  async deleteFile(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    return this.uploadService.softDeleteFile(id, authUser.id);
  }
}
