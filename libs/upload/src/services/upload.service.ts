import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '@weaver2/prisma';
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
import { UpdateFileCommand } from '../repositories/update-file.command';
import { FileDto } from '../dto/file.dto';
import { AdminFilesQueryDto } from '../dto/admin-files-query.dto';
import { UserFilesQueryDto } from '../dto/user-files-query.dto';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly thumbnail: ThumbnailService,
    private readonly createFileCmd: CreateFileCommand,
    private readonly findFileByIdQuery: FindFileByIdQuery,
    private readonly deleteFileCmd: DeleteFileCommand,
    private readonly updateFileCmd: UpdateFileCommand,
  ) {}

  async uploadFiles(
    files: Express.Multer.File[],
    uploadedById: string | undefined,
    options: {
      postId?: string;
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

      const now = new Date();
      const year = now.getFullYear().toString();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const directory = path.join('uploads', year, month);

      const { path: filePath } = await this.storage.save(file, directory);

      let thumbnailPath: string | undefined;
      if (options.generateThumbnail && this.thumbnail.isImage(file.mimetype)) {
        const thumbBuffer = await this.thumbnail.generate(
          file.buffer,
          options.thumbnailWidth,
          options.thumbnailHeight,
        );
        const ext = path.extname(file.originalname).toLowerCase();
        const { path: thumbPath } = await this.storage.saveBuffer(
          thumbBuffer,
          `thumb${ext}`,
          directory,
        );
        thumbnailPath = thumbPath;
      }

      const record = await this.createFileCmd.execute({
        originalName: file.originalname,
        storedName: path.basename(filePath),
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        thumbnailPath,
        postId: options.postId,
        uploadedById,
      });

      results.push(await this.toDto(record));
    }

    return results;
  }

  async findFileById(id: string): Promise<FileDto> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);
    return this.toDto(file);
  }

  async findFilesByUserId(
    userId: string,
    query: UserFilesQueryDto,
  ): Promise<KeysetResponseDto<FileDto>> {
    const where: Record<string, unknown> = {
      uploadedById: userId,
      deletedAt: null,
    };
    if (query.postId) where.postId = query.postId;

    return KeysetPaginationService.paginate<FileDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.postFile as any,
      preset: query.preset,
      cursor: query.cursor,
      limit: query.limit,
      where,
    });
  }

  async findAllFilesForAdmin(
    query: AdminFilesQueryDto,
  ): Promise<KeysetResponseDto<FileDto>> {
    const where: Record<string, unknown> = {};
    if (query.uploadedById) where.uploadedById = query.uploadedById;
    if (query.postId) where.postId = query.postId;
    if (!query.includeDeleted) where.deletedAt = null;

    return KeysetPaginationService.paginate<FileDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.postFile as any,
      preset: query.preset,
      cursor: query.cursor,
      limit: query.limit,
      where,
    });
  }

  async findFilesByPostId(postId: string): Promise<FileDto[]> {
    const files = await this.prisma.postFile.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(files.map((f) => this.toDto(f)));
  }

  async getFileUrl(id: string): Promise<string> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);
    return this.storage.getFileUrl(file.path);
  }

  async getThumbnailUrl(id: string): Promise<string | null> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);
    if (!file.thumbnailPath) return null;
    return this.storage.getFileUrl(file.thumbnailPath);
  }

  async softDeleteFile(id: string, userId: string): Promise<void> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);
    if (file.uploadedById !== userId) {
      throw new ForbiddenException(
        '본인이 업로드한 파일만 삭제할 수 있습니다.',
      );
    }
    await this.deleteFileCmd.softDelete(id);
  }

  async linkToPost(
    id: string,
    postId: string,
    userId: string,
  ): Promise<FileDto> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);
    if (file.uploadedById !== userId) {
      throw new ForbiddenException(
        '본인이 업로드한 파일만 연결할 수 있습니다.',
      );
    }
    const updated = await this.updateFileCmd.linkToPost(id, postId);
    return this.toDto(updated);
  }

  async purgeOrphanedFiles(retentionHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    const orphans = await this.prisma.postFile.findMany({
      where: { postId: null, deletedAt: null, createdAt: { lte: cutoff } },
      select: { id: true, path: true, thumbnailPath: true },
    });

    for (const file of orphans) {
      await this.storage.delete(file.path);
      if (file.thumbnailPath) {
        await this.storage.delete(file.thumbnailPath);
      }
    }

    if (orphans.length > 0) {
      await this.prisma.postFile.deleteMany({
        where: { id: { in: orphans.map((f) => f.id) } },
      });
    }

    return orphans.length;
  }

  async hardDeleteFile(id: string): Promise<void> {
    const file = await this.prisma.postFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);

    await this.storage.delete(file.path);
    if (file.thumbnailPath) {
      await this.storage.delete(file.thumbnailPath);
    }
    await this.deleteFileCmd.hardDelete(id);
  }

  private async toDto(file: {
    id: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    path: string;
    thumbnailPath: string | null;
    postId: string | null;
    uploadedById: string | null;
    createdAt: Date;
    deletedAt: Date | null;
  }): Promise<FileDto> {
    const url = await this.storage.getFileUrl(file.path);
    const thumbnailUrl = file.thumbnailPath
      ? await this.storage.getFileUrl(file.thumbnailPath)
      : null;

    return {
      id: file.id,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType,
      size: file.size,
      url,
      thumbnailUrl,
      postId: file.postId,
      uploadedById: file.uploadedById,
      createdAt: file.createdAt,
      deletedAt: file.deletedAt,
    };
  }
}
