import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
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
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import {
  UploadService,
  FileDto,
  UploadFileDto,
  LinkPostDto,
  UserFilesQueryDto,
} from '@weaver2/upload';
import { ApiKeysetResponse, KeysetResponseDto } from '@weaver2/pagination';
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

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '내 파일 목록 조회 (keyset 페이지네이션)' })
  @ApiKeysetResponse(FileDto)
  async getMyFiles(
    @Query() query: UserFilesQueryDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<FileDto>> {
    return this.uploadService.findFilesByUserId(authUser.id, query);
  }

  @Get('post/:postId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '게시글에 첨부된 파일 목록 조회 (공개)' })
  @ApiStandardResponses({ type: FileDto, isArray: true })
  async getPostFiles(@Param('postId') postId: string): Promise<FileDto[]> {
    return this.uploadService.findFilesByPostId(postId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '파일 업로드',
    description:
      'multipart/form-data로 파일을 업로드합니다. 최대 업로드 개수는 시스템 설정을 따릅니다. postId를 지정하면 게시글과 연결됩니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiStandardResponses({ type: FileDto, isArray: true })
  @UseInterceptors(FilesInterceptor('files', 50, { storage: memoryStorage() }))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query() dto: UploadFileDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<FileDto[]> {
    const settings = await this.systemSettingService.getAll();

    if (files.length > settings.uploadMaxFileCount) {
      throw new BadRequestException(
        `한 번에 최대 ${settings.uploadMaxFileCount}개의 파일만 업로드할 수 있습니다.`,
      );
    }

    return this.uploadService.uploadFiles(files, authUser?.id, {
      postId: dto.postId,
      maxFileSize: settings.uploadMaxFileSize,
      allowedMimeTypes: settings.uploadAllowedMimeTypes,
      generateThumbnail: dto.generateThumbnail ?? true,
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

  @Patch(':id/unlink')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '파일 게시글 연결 해제',
    description: 'postId를 null로 초기화합니다. 본인 파일만 가능합니다.',
  })
  @ApiStandardResponses({ type: FileDto })
  async unlinkFromPost(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<FileDto> {
    return this.uploadService.unlinkFromPost(id, authUser.id);
  }

  @Patch(':id/link')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '파일을 게시글에 연결',
    description: '업로드된 파일에 postId를 설정합니다. 본인 파일만 가능합니다.',
  })
  @ApiStandardResponses({ type: FileDto })
  async linkToPost(
    @Param('id') id: string,
    @Body() dto: LinkPostDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<FileDto> {
    return this.uploadService.linkToPost(id, dto.postId, authUser.id);
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
