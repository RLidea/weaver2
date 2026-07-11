import { apiClient } from '@weaver2/api-client';

export interface PostFileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
}

export const uploadApi = {
  getPostFiles: (postId: string) =>
    apiClient.get<PostFileItem[]>(`/v1/upload/post/${postId}`),

  uploadFiles: (files: File[], postId: string): Promise<PostFileItem[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return apiClient
      .postForm<PostFileItem[]>(`/v1/upload?postId=${postId}`, formData)
      .then((res) => res.data);
  },

  deleteFile: (fileId: string) =>
    apiClient.delete<void>(`/v1/upload/${fileId}`),
};
