import { apiClient } from '@weaver2/api-client';
import type { Emoji } from '../types';

export const emojiApi = {
  getAll: () => apiClient.get<Emoji[]>('/v1/emojis'),
};
