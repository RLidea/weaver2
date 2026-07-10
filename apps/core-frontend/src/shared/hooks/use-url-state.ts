'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * 목록 화면의 조회 조건(필터·검색·정렬·페이지·탭)을 URL 쿼리스트링에 두는 공통 훅.
 *
 * 왜 URL에 두나: 새로고침·공유·뒤로가기에도 조건이 보존된다.
 * 왜 공통 훅인가: 기존에는 useSearchParams + URLSearchParams + router 조합이 목록 화면마다
 * 복붙되어 push/replace가 뒤섞이고 "필터 바꾸면 page 리셋" 같은 규칙을 각자 기억해야 했다.
 *
 * 규약:
 * - 값이 스키마 기본값과 같으면 URL에서 아예 뺀다 → 주소창이 깔끔하고 공유 URL이 짧아진다.
 * - 히스토리는 replace로 통일한다(필터 단계마다 뒤로가기 스택을 쌓지 않음).
 * - number 등 문자열이 아닌 필드는 `parse`를 지정한다(예: `parse: Number`).
 */

export interface UrlStateField<T> {
  default: T;
  /** URL 문자열 → 값. 미지정 시 문자열을 그대로 T로 취급. */
  parse?: (raw: string) => T;
  /** 값 → URL 문자열. 미지정 시 String(). */
  serialize?: (value: T) => string;
}

// 각 필드가 서로 다른 타입을 가지는 제네릭 스키마 컨테이너라 any가 불가피하다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UrlStateSchema = Record<string, UrlStateField<any>>;

type ValuesOf<S extends UrlStateSchema> = {
  [K in keyof S]: S[K] extends UrlStateField<infer T> ? T : never;
};

export interface UrlStateOptions<S extends UrlStateSchema> {
  /** 이 목록에 없는 다른 키가 변경되면 기본값으로 되돌릴 키들(대표적으로 'page'). */
  resetKeys?: (keyof S)[];
}

export function useUrlState<S extends UrlStateSchema>(
  schema: S,
  options?: UrlStateOptions<S>,
): [ValuesOf<S>, (updates: Partial<ValuesOf<S>>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 계산이 가벼우므로 매 렌더 파생한다(searchParams 변경 시에만 리렌더됨).
  const values = {} as ValuesOf<S>;
  for (const key in schema) {
    const raw = searchParams.get(key);
    const spec = schema[key];
    values[key] = (
      raw === null ? spec.default : spec.parse ? spec.parse(raw) : raw
    ) as ValuesOf<S>[typeof key];
  }

  const setValues = useCallback(
    (updates: Partial<ValuesOf<S>>) => {
      const next = new URLSearchParams(searchParams.toString());

      const writeKey = (key: keyof S, value: unknown) => {
        const spec = schema[key];
        const serialized =
          value === undefined || value === null
            ? null
            : spec.serialize
              ? spec.serialize(value)
              : String(value);
        const defaultSerialized = spec.serialize
          ? spec.serialize(spec.default)
          : String(spec.default);
        // 기본값과 같거나 비어 있으면 URL에서 제거
        if (serialized === null || serialized === defaultSerialized) {
          next.delete(String(key));
        } else {
          next.set(String(key), serialized);
        }
      };

      for (const key in updates) {
        writeKey(key, updates[key]);
      }

      // resetKeys: reset 대상이 아닌 키가 바뀌었고, 이번 updates에서 명시되지 않았다면 기본값으로 되돌린다.
      const resetKeys = options?.resetKeys ?? [];
      const changedNonResetKey = Object.keys(updates).some(
        (k) => !resetKeys.includes(k as keyof S),
      );
      if (changedNonResetKey) {
        for (const rk of resetKeys) {
          if (!(rk in updates)) next.delete(String(rk));
        }
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router, schema, options],
  );

  return [values, setValues];
}
