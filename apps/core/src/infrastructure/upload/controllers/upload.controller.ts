import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
