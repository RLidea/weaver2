import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import * as path from 'path';
import { memoryStorage } from 'multer';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import {
  FileDto,
  FindFileByIdQuery,
  setUploadResponseHeaders,
  uploadTypeByExtension,
  UploadFileDto,
  UploadService,
  UserFilesQueryDto,
} from '@weaver2/upload';
import { ApiKeysetResponse, KeysetResponseDto } from '@weaver2/pagination';
import { SystemSettingService } from '../../config/system-setting.service';
import { FileAccessService } from '../file-access/file-access.service';
import { FileAccessVerdict } from '../file-access/file-access-rule';

/**
 * 파일을 내주는 길은 여기 하나다 (파일 접근 통제 설계 §4.2). 정적 /uploads 는 없다.
 * 받을 때마다 붙은 쪽의 읽기 정책을 묻고, 못 보는 파일은 404 — 존재 여부를 알리지 않는다.
 */
@ApiTags('Files')
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly findFileById: FindFileByIdQuery,
    private readonly fileAccess: FileAccessService,
    private readonly systemSettingService: SystemSettingService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '내가 올린 파일 목록 (keyset 페이지네이션)' })
  @ApiKeysetResponse(FileDto)
  async getMyFiles(
    @Query() query: UserFilesQueryDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<FileDto>> {
    return this.uploadService.findFilesByUserId(authUser.id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '파일 업로드',
    description:
      'multipart/form-data 로 올린다. 어디에도 붙지 않은 채 저장되고, 붙이기는 붙는 쪽이 한다 — 글 생성·수정의 `attachmentFileIds`. 붙지 않은 파일은 보존 기간 뒤 정리된다.',
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

    return this.uploadService.uploadFiles(files, authUser.id, {
      maxFileSize: settings.uploadMaxFileSize,
      allowedMimeTypes: settings.uploadAllowedMimeTypes,
      generateThumbnail: dto.generateThumbnail ?? true,
      thumbnailWidth: settings.uploadThumbnailWidth,
      thumbnailHeight: settings.uploadThumbnailHeight,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: '파일 받기',
    description:
      '붙은 쪽의 읽기 정책을 본다. 로컬은 본문을 스트림하고, S3 는 60초짜리 서명 URL 로 302. 못 보는 파일은 404.',
  })
  @ApiResponse({ status: 200, description: '파일 본문 (로컬)' })
  @ApiResponse({ status: 302, description: '서명 URL (S3)' })
  @ApiResponse({ status: 404, description: '없거나 볼 수 없는 파일' })
  async serveFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
    @AuthUser() viewer?: CommonAuthUserDto,
  ): Promise<void> {
    await this.send(id, false, req, res, viewer);
  }

  @Get(':id/thumbnail')
  @Public()
  @ApiOperation({
    summary: '썸네일 받기',
    description: '파일과 같은 판정. 썸네일이 없으면 404.',
  })
  @ApiResponse({ status: 200, description: '썸네일 본문 (로컬)' })
  @ApiResponse({ status: 302, description: '서명 URL (S3)' })
  @ApiResponse({ status: 404, description: '없거나 볼 수 없는 썸네일' })
  async serveThumbnail(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
    @AuthUser() viewer?: CommonAuthUserDto,
  ): Promise<void> {
    await this.send(id, true, req, res, viewer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '파일 지우기 (본인 파일만)',
    description:
      '지움 표시와 함께 글 첨부·프로필에서 떼어 낸다. 실제 삭제는 보존 기간 뒤.',
  })
  @ApiStandardResponses({ status: 204, description: 'File deleted' })
  async deleteFile(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    return this.uploadService.softDeleteFile(id, authUser.id);
  }

  private async send(
    id: string,
    thumbnail: boolean,
    req: Request,
    res: Response,
    viewer: CommonAuthUserDto | undefined,
  ): Promise<void> {
    const file = await this.findFileById.execute(id);
    const verdict = file ? await this.fileAccess.canRead(file, viewer) : 'deny';
    const delivery =
      file && verdict !== 'deny'
        ? await this.uploadService.deliver(file, thumbnail)
        : null;
    if (!file || !delivery) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    if (delivery.kind === 'redirect') {
      // 리다이렉트가 캐시되면 60초 뒤 만료된 서명을 가리킨다
      res.setHeader('Cache-Control', 'private, no-store');
      res.redirect(HttpStatus.FOUND, delivery.url);
      return;
    }

    // 저장 키의 내용은 바뀌지 않는다 — id 가 곧 내용의 이름이다
    const etag = `"${file.id}${thumbnail ? '.thumb' : ''}"`;
    res.setHeader('Cache-Control', cacheControl(verdict));
    res.setHeader('ETag', etag);
    setUploadResponseHeaders(res, delivery.key);
    if (req.headers['if-none-match'] === etag) {
      delivery.stream.destroy();
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }

    const type = uploadTypeByExtension(path.extname(delivery.key));
    res.setHeader(
      'Content-Type',
      type?.contentType ?? 'application/octet-stream',
    );
    // Content-Length 는 DB 의 size 로 걸지 않는다 — 저장된 바이트와 어긋나면(옛 데이터 등) 본문이 길이를
    // 넘쳐 keep-alive 연결의 다음 응답이 깨진다. 청크 전송에 맡긴다
    delivery.stream.on('error', () => res.destroy());
    delivery.stream.pipe(res);
  }
}

/**
 * 권한·가림이 바뀌면 곧 반영돼야 한다. 누구나 보는 파일만 5분 캐시를 받아들이고(가림·삭제가
 * 최대 5분 늦게 반영된다), 그 밖은 매번 권한을 다시 묻되 본문은 304 로 아낀다.
 */
function cacheControl(verdict: FileAccessVerdict): string {
  return verdict === 'public' ? 'public, max-age=300' : 'private, no-cache';
}
