import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageProvider } from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  async save(
    file: Express.Multer.File,
    directory: string,
  ): Promise<{ storedName: string; path: string }> {
    await fs.mkdir(directory, { recursive: true });

    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${randomUUID()}${ext}`;
    const filePath = path.join(directory, storedName);

    await fs.writeFile(filePath, file.buffer);

    return { storedName, path: filePath };
  }

  async saveBuffer(
    buffer: Buffer,
    filename: string,
    directory: string,
  ): Promise<{ storedName: string; path: string }> {
    await fs.mkdir(directory, { recursive: true });

    const ext = path.extname(filename).toLowerCase();
    const storedName = `${randomUUID()}${ext}`;
    const filePath = path.join(directory, storedName);

    await fs.writeFile(filePath, buffer);

    return { storedName, path: filePath };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // 파일이 없으면 무시
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(filePath: string): Promise<string> {
    // main.ts useStaticAssets: cwd/uploads → /uploads prefix
    // DB path: uploads/2026/02/uuid.ext → URL: /uploads/2026/02/uuid.ext
    return Promise.resolve(`/${filePath}`);
  }
}
