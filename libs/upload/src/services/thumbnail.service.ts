import { Injectable } from '@nestjs/common';
// sharp 0.35 부터 `typeof import('sharp')` 는 더 이상 호출 가능한 타입이 아니다.
// 그래서 require + 수동 타입 단언으로는 이 파일이 컴파일되지 않는다 — 런타임은
// 멀쩡한데 타입만 깨지므로, 증상이 「썸네일이 안 된다」가 아니라 이 파일을
// import 하는 시험 전부가 안 도는 모습으로 나온다. 정식 default import 를 쓴다.
import sharp from 'sharp';

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
    width: number,
    height: number,
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
  }
}
