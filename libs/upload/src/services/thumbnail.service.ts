import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as (
  input: Buffer,
) => ReturnType<typeof import('sharp')>;
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

@Injectable()
export class ThumbnailService {
  isImage(mimeType: string): boolean {
    return IMAGE_MIME_TYPES.has(mimeType);
  }

  async generate(
    buffer: Buffer,
    directory: string,
    ext: string,
    width: number,
    height: number,
  ): Promise<string> {
    await fs.mkdir(directory, { recursive: true });

    const thumbName = `thumb_${randomUUID()}${ext}`;
    const thumbPath = path.join(directory, thumbName);

    await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbPath);

    return thumbPath;
  }
}
