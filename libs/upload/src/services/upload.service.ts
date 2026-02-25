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
import { FileDto } from '../dto/file.dto';
import { AdminFilesQueryDto } from '../dto/admin-files-query.dto';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly thumbnail: ThumbnailService,
    private readonly createFileCmd: CreateFileCommand,
    private readonly findFileByIdQuery: FindFileByIdQuery,
    private readonly deleteFileCmd: DeleteFileCommand,
  ) {}

  async uploadFiles(
    files: Express.Multer.File[],
    uploadedById: string | undefined,
    options: {
      postId?: string;
      maxFileSize: number;
      allowedMimeTypes: string[];
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

      const { storedName, path: filePath } = await this.storage.save(
        file,
        directory,
      );

      let thumbnailPath: string | undefined;
      if (this.thumbnail.isImage(file.mimetype)) {
        const ext = path.extname(file.originalname).toLowerCase();
        thumbnailPath = await this.thumbnail.generate(
          file.buffer,
          directory,
          ext,
          options.thumbnailWidth,
          options.thumbnailHeight,
        );
      }

      const record = await this.createFileCmd.execute({
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        thumbnailPath,
        postId: options.postId,
        uploadedById,
      });

      results.push(this.toDto(record));
    }

    return results;
  }

  async findFileById(id: string): Promise<FileDto> {
    const file = await this.findFileByIdQuery.execute(id);
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);
    return this.toDto(file);
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
      prisma: this.prisma.file as any,
      preset: query.preset,
      cursor: query.cursor,
      limit: query.limit,
      where,
    });
  }

  async findFilesByPostId(postId: string): Promise<FileDto[]> {
    const files = await this.prisma.file.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return files.map((f) => this.toDto(f));
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

  async hardDeleteFile(id: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`파일을 찾을 수 없습니다: ${id}`);

    await this.storage.delete(file.path);
    if (file.thumbnailPath) {
      await this.storage.delete(file.thumbnailPath);
    }
    await this.deleteFileCmd.hardDelete(id);
  }

  private toDto(file: {
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
  }): FileDto {
    return {
      id: file.id,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      thumbnailPath: file.thumbnailPath,
      postId: file.postId,
      uploadedById: file.uploadedById,
      createdAt: file.createdAt,
      deletedAt: file.deletedAt,
    };
  }
}
