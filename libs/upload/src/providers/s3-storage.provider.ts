import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { StorageProvider, StoredFileType } from './storage-provider.interface';
import { uploadTypeByExtension } from '../file-types';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('S3_REGION');
    const endpoint = this.configService.get<string>('S3_ENDPOINT');

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'S3_SECRET_ACCESS_KEY',
        ),
      },
      ...(endpoint && { endpoint, forcePathStyle: true }),
    });

    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');
  }

  async save(
    file: Express.Multer.File,
    directory: string,
    type: StoredFileType,
  ): Promise<{ storedName: string; path: string }> {
    // 확장자·Content-Type 은 사용자 입력이 아니라 검증된 형식에서
    const storedName = `${randomUUID()}${type.ext}`;
    const key = `${directory}/${storedName}`.replace(/\\/g, '/');

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: type.contentType,
        ...(!type.inline && { ContentDisposition: 'attachment' }),
      }),
    );

    return { storedName, path: key };
  }

  async saveBuffer(
    buffer: Buffer,
    filename: string,
    directory: string,
  ): Promise<{ storedName: string; path: string }> {
    const ext = path.extname(filename).toLowerCase();
    const storedName = `${randomUUID()}${ext}`;
    const key = `${directory}/${storedName}`.replace(/\\/g, '/');
    // 썸네일 파일명의 확장자는 업로드 서비스가 검증된 형식에서 붙인다 — 그 형식으로 저장한다.
    // 비워 두면 S3 가 binary/octet-stream 으로 저장해 이미지가 인라인으로 안 보인다
    const type = uploadTypeByExtension(ext);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: type?.contentType ?? 'application/octet-stream',
        ...(!type?.inline && { ContentDisposition: 'attachment' }),
      }),
    );

    return { storedName, path: key };
  }

  async read(key: string): Promise<Readable | null> {
    try {
      const { Body } = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return Body instanceof Readable ? Body : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // 없는 파일이면 무시
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getFileUrl(key: string): Promise<string> {
    // 응답 헤더를 서명 URL 에서 덮어쓴다. 형식 확인 전에 저장된 객체는 공격자가 선언한
    // Content-Type(text/html 등)을 메타데이터로 들고 있어, 그대로 내보내면 버킷 출처에서
    // HTML 로 열린다. 저장된 메타데이터를 믿지 않고 저장 확장자(서버가 형식에서 정한 것)로
    // 다시 정한다 — 표에 없는 확장자는 octet-stream, 이미지가 아니면 내려받기.
    const type = uploadTypeByExtension(path.extname(key));
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: type?.contentType ?? 'application/octet-stream',
      ResponseContentDisposition: type?.inline ? 'inline' : 'attachment',
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }
}
