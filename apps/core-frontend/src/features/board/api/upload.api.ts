import { apiClient } from '@weaver2/api-client';

/** 올린 파일. url·thumbnailUrl 은 받을 때마다 권한을 묻는 /v1/files 주소다 */
export interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
}

export const uploadApi = {
  /** 어디에도 붙지 않은 채 올린다 — 글 저장 때 attachmentFileIds 로 붙인다 */
  uploadFiles: (files: File[]): Promise<FileItem[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return apiClient
      .postForm<FileItem[]>('/v1/files', formData)
      .then((res) => res.data);
  },
};
