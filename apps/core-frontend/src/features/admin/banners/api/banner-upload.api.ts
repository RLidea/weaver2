import { apiClient } from '@/infrastructure/api-client';

// upload 응답(FileDto)의 부분 형태를 로컬로 정의한다.
// banner는 self-contained 모듈이라 board 등 다른 feature의 타입을 import하지 않는다.
export interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
}

export const bannerUploadApi = {
  uploadImage: (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('files', file);
    return apiClient
      .postForm<UploadedImage[]>('/v1/upload', formData)
      .then((res) => {
        const first = res.data[0];
        if (!first) throw new Error('이미지 업로드 결과가 비어 있습니다.');
        return first;
      });
  },
};
