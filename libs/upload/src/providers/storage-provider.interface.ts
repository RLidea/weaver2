export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  save(
    file: Express.Multer.File,
    directory: string,
  ): Promise<{ storedName: string; path: string }>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
