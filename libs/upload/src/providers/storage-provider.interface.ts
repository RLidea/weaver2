import type { Readable } from 'stream';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

/** 업로드 서비스가 검증한 형식 — 저장소는 사용자 파일명·선언 형식을 쓰지 않는다 */
export interface StoredFileType {
  /** 저장 확장자 (예: `.png`) */
  ext: string;
  contentType: string;
  /** 인라인으로 보여 줘도 되는가 — 아니면 내려받기로 낸다 */
  inline: boolean;
}

export interface StorageProvider {
  save(
    file: Express.Multer.File,
    directory: string,
    type: StoredFileType,
  ): Promise<{ storedName: string; path: string }>;
  saveBuffer(
    buffer: Buffer,
    filename: string,
    directory: string,
  ): Promise<{ storedName: string; path: string }>;
  /** 저장된 객체를 읽는다. 없으면 null. 직접 만든 공급자는 이것을 구현해야 한다 */
  read(path: string): Promise<Readable | null>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /**
   * 서명 URL 을 낼 수 있는 저장소(S3)만 구현한다. 있으면 /v1/files 가 권한 판정 뒤 이 주소로 302,
   * 없으면 read 로 스트림한다. 저장소 주소를 그대로 공개하지 않는다 — 내주는 길은 /v1/files 하나다.
   */
  getFileUrl?(path: string, expiresInSeconds: number): Promise<string>;
}
