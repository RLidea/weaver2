/**
 * 서버 컴포넌트 전용 API 유틸리티
 *
 * - Next.js 서버 사이드(RSC, Server Actions)에서만 사용
 * - 클라이언트 컴포넌트에서는 apiClient를 사용할 것
 * - 쿠키를 자동으로 백엔드에 전달 (인증 포함)
 */
import { cookies } from 'next/headers';
import type { ApiResponse } from '@/types/api';

const API_URL = process.env.API_URL;

if (!API_URL && typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // 빌드 타임에는 경고만 (정적 페이지는 쿠키 없이도 fetch 가능)
  console.warn('[server-api] API_URL environment variable is not set');
}

interface ServerFetchOptions {
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

export async function serverFetch<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    cache: options.cache ?? 'no-store',
    next: options.next,
  });

  if (!res.ok) {
    throw new Error(`[server-api] ${path} failed with status ${res.status}`);
  }

  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}
