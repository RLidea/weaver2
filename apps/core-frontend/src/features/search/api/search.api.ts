import { apiClient } from '@weaver2/api-client';
import type { SearchParams, SearchResult } from '../types';

export const searchApi = {
  search: (params: SearchParams) => {
    const qs = new URLSearchParams();
    qs.set('q', params.q);
    if (params.type) qs.set('type', params.type);
    if (params.boardId) qs.set('boardId', params.boardId);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return apiClient.get<SearchResult>(`/v1/search?${qs.toString()}`);
  },
};
