import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import type { Readable } from 'stream';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageProvider, StoredFileType } from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  async save(
    file: Express.Multer.File,
    directory: string,
    type: StoredFileType,
  ): Promise<{ storedName: string; path: string }> {
    await fs.mkdir(directory, { recursive: true });

    // 확장자는 사용자 파일명이 아니라 검증된 형식에서 — 정적 서빙이 확장자로 Content-Type 을 정한다
    const storedName = `${randomUUID()}${type.ext}`;
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

  async read(filePath: string): Promise<Readable | null> {
    // 열 수 있는지 먼저 본다 — 스트림의 ENOENT 는 응답을 시작한 뒤에야 터진다
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    return createReadStream(filePath);
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
}
