import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import type { Readable } from 'stream';
import { File, Prisma, PrismaService } from '@weaver2/prisma';
import {
  KeysetPaginationService,
  KeysetResponseDto,
} from '@weaver2/pagination';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../providers/storage-provider.interface';
import { ThumbnailService } from './thumbnail.service';
import { CreateFileCommand } from '../repositories/create-file.command';
import { FindFileByIdQuery } from '../repositories/find-file-by-id.query';
import { DeleteFileCommand } from '../repositories/delete-file.command';
import { FileDto } from '../dto/file.dto';
import { AdminFilesQueryDto } from '../dto/admin-files-query.dto';
import { UserFilesQueryDto } from '../dto/user-files-query.dto';
import { uploadFileType } from '../file-types';

/** S3 서명 URL 의 수명 — 302 를 받은 브라우저가 곧바로 쓰는 만큼만 */
const SIGNED_URL_SECONDS = 60;

/** 파일을 내주는 방법 — 로컬은 스트림, 서명 URL 을 낼 수 있는 저장소는 302 */
export type FileDelivery =
  | { kind: 'stream'; stream: Readable; key: string }
  | { kind: 'redirect'; url: string };

/** 이 행을 「어디에도 안 붙은 파일」로 본다 — 본체가 아는 붙음(첨부·프로필)이 없다 */
const UNATTACHED: Prisma.FileWhereInput = {
  postAttachment: { is: null },
  profileOf: { is: null },
};

@Injectable()
export class UploadService {
  private readonly urlBase: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly thumbnail: ThumbnailService,
    private readonly createFileCmd: CreateFileCommand,
    private readonly findFileByIdQuery: FindFileByIdQuery,
    private readonly deleteFileCmd: DeleteFileCommand,
    config: ConfigService,
  ) {
    // Next 리라이트(/api)를 거치는 같은 출처 주소 — 쿠키가 따라가 <img src> 가 그대로 동작한다
    this.urlBase = config.get<string>('FILE_URL_BASE', '/api');
  }

  async uploadFiles(
    files: Express.Multer.File[],
    uploadedById: string | undefined,
    options: {
      maxFileSize: number;
      allowedMimeTypes: string[];
      generateThumbnail: boolean;
      thumbnailWidth: number;
      thumbnailHeight: number;
    },
  ): Promise<FileDto[]> {
    const results: FileDto[] = [];

    for (const file of files) {
      if (file.size > options.maxFileSize) {
        throw new BadRequestException(
          `파일 크기가 허용 한도(${options.maxFileSize} bytes)를 초과했습니다: ${file.originalname}`,
        );
      }

      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `허용되지 않는 MIME 타입입니다: ${file.mimetype}`,
        );
      }

      // 선언한 형식(클라이언트가 보낸 Content-Type)은 믿지 않는다 — 시그니처가 맞아야 받는다
      const fileType = uploadFileType(file.mimetype);
      if (!fileType) {
        throw new BadRequestException(
          `내용을 확인할 수 없는 형식이라 받지 않습니다: ${file.mimetype}`,
        );
      }
      if (!fileType.matches(file.buffer)) {
        throw new BadRequestException(
          `파일 내용이 선언한 형식(${file.mimetype})과 다릅니다: ${file.originalname}`,
        );
      }

      const directory = this.directoryFor(new Date());

      const { path: storageKey } = await this.storage.save(file, directory, {
        ext: fileType.ext,
        contentType: file.mimetype,
        inline: fileType.inline,
      });

      let thumbnailKey: string | undefined;
      if (options.generateThumbnail && this.thumbnail.isImage(file.mimetype)) {
        const thumbBuffer = await this.thumbnail.generate(
          file.buffer,
          options.thumbnailWidth,
          options.thumbnailHeight,
        );
        // sharp 는 입력 형식을 그대로 내보낸다 — 확장자도 검증된 형식에서
        const { path: thumbPath } = await this.storage.saveBuffer(
          thumbBuffer,
          `thumb${fileType.ext}`,
          directory,
        );
        thumbnailKey = thumbPath;
      }

      const record = await this.createFileCmd.execute({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        thumbnailKey,
        uploadedById,
      });

      results.push(this.toDto(record));
    }

    return results;
  }

  /** 로컬 저장소 키의 디렉터리 — uploads/YYYY/MM */
  directoryFor(now: Date): string {
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return path.join('uploads', year, month);
  }

  async findFilesByUserId(
    userId: string,
    query: UserFilesQueryDto,
  ): Promise<KeysetResponseDto<FileDto>> {
    const page = await KeysetPaginationService.paginate<File>({
      prisma: this.prisma.file,
      preset: query.preset,
      cursor: query.cursor,
      limit: query.limit,
      where: { uploadedById: userId, deletedAt: null },
    });
    return { ...page, data: page.data.map((f) => this.toDto(f)) };
  }

  async findAllFilesForAdmin(
    query: AdminFilesQueryDto,
  ): Promise<KeysetResponseDto<FileDto>> {
    const where: Prisma.FileWhereInput = {};
    if (query.uploadedById) where.uploadedById = query.uploadedById;
    if (query.postId) where.postAttachment = { postId: query.postId };
    if (!query.includeDeleted) where.deletedAt = null;

    const page = await KeysetPaginationService.paginate<File>({
      prisma: this.prisma.file,
      preset: query.preset,
      cursor: query.cursor,
      limit: query.limit,
      where,
    });
    return { ...page, data: page.data.map((f) => this.toDto(f)) };
  }

  /**
   * 저장소에서 꺼낸다. 권한 판정은 호출자(FileAccessService)가 먼저 한다.
   * 서명 URL 을 낼 수 있는 저장소면 302, 아니면 스트림. 객체가 없으면 null.
   */
  async deliver(file: File, thumbnail: boolean): Promise<FileDelivery | null> {
    const key = thumbnail ? file.thumbnailKey : file.storageKey;
    if (!key) return null;
    if (this.storage.getFileUrl) {
      return {
        kind: 'redirect',
        url: await this.storage.getFileUrl(key, SIGNED_URL_SECONDS),
      };
    }
    const stream = await this.storage.read(key);
    return stream ? { kind: 'stream', stream, key } : null;
  }

  async softDeleteFile(id: string, userId: string): Promise<void> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file || file.deletedAt) {
      throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);
    }
    if (file.uploadedById !== userId) {
      throw new ForbiddenException(
        '본인이 업로드한 파일만 삭제할 수 있습니다.',
      );
    }
    await this.deleteFileCmd.softDelete(id, new Date());
  }

  /** 관리자 물리 삭제. 본체가 아는 붙음은 끊고, 그 밖(파생 프로젝트의 첨부)에 붙어 있으면 409 */
  async hardDeleteFile(id: string): Promise<void> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);

    await this.deleteFileCmd.softDelete(id, file.deletedAt ?? new Date());
    if (!(await this.deleteFileCmd.hardDelete(id))) {
      throw new ConflictException(
        '다른 곳에 붙어 있는 파일이라 지울 수 없습니다. 붙은 쪽에서 먼저 떼어 내세요.',
      );
    }
    await this.deleteStoredObjects(file);
  }

  /**
   * 「어디에도 안 붙은 채 보존 기간이 지난 파일」과 「지운 지 보존 기간이 지난 파일」을 물리 삭제한다.
   * 행 먼저 — 파생 프로젝트의 첨부에 붙어 있으면 FK(Restrict)가 막고, 그 파일은 건너뛴다.
   */
  async purgeOrphanedFiles(retentionHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    const candidates = await this.prisma.file.findMany({
      where: {
        OR: [
          // 한 번도 안 붙었던 파일은 올린 때부터, 떼어진 파일은 뗀 때부터 잰다
          {
            ...UNATTACHED,
            deletedAt: null,
            detachedAt: null,
            createdAt: { lte: cutoff },
          },
          { ...UNATTACHED, deletedAt: null, detachedAt: { lte: cutoff } },
          { ...UNATTACHED, deletedAt: { lte: cutoff } },
        ],
      },
    });

    let purged = 0;
    for (const file of candidates) {
      if (!(await this.deleteFileCmd.hardDelete(file.id))) continue;
      await this.deleteStoredObjects(file);
      purged += 1;
    }
    return purged;
  }

  toDto(file: File): FileDto {
    const url = `${this.urlBase}/v1/files/${file.id}`;
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url,
      thumbnailUrl: file.thumbnailKey ? `${url}/thumbnail` : null,
      uploadedById: file.uploadedById,
      createdAt: file.createdAt,
      deletedAt: file.deletedAt,
    };
  }

  /** 파일 id 로 내줄 주소 — 사용자 DTO 의 profileImageUrl 처럼 행 없이 주소만 필요한 곳이 쓴다 */
  urlFor(fileId: string): string {
    return `${this.urlBase}/v1/files/${fileId}`;
  }

  private async deleteStoredObjects(file: File): Promise<void> {
    await this.storage.delete(file.storageKey);
    if (file.thumbnailKey) await this.storage.delete(file.thumbnailKey);
  }
}
