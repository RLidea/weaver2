import { apiClient } from '@weaver2/api-client';
import type {
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
  RequestEmailChangeRequest,
  ConfirmEmailChangeRequest,
} from '../types';

export const userApi = {
  getByUsername: (username: string) =>
    apiClient.get<User>(`/v1/users/${username}`),

  updateProfile: (body: UpdateProfileRequest) =>
    apiClient.patch<void>('/v1/users/me', body),

  changePassword: (body: ChangePasswordRequest) =>
    apiClient.patch<void>('/v1/users/me/password', body),

  requestEmailChange: (body: RequestEmailChangeRequest) =>
    apiClient.post<void>('/v1/users/me/email', body),

  confirmEmailChange: (body: ConfirmEmailChangeRequest) =>
    apiClient.post<void>('/v1/users/me/email/confirm', body),

  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<{ imageUrl: string }>('/v1/users/me/profile-image', formData);
  },

  deleteAccount: () =>
    apiClient.delete<void>('/v1/users/me'),
};
