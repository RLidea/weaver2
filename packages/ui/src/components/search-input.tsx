'use client';

import { useEffect, useState } from 'react';
import { Input } from './input';

interface SearchInputProps {
  /** 바깥(대개 URL 상태)이 들고 있는 확정 값. */
  value: string;
  /** debounce 가 끝난 뒤에만 불린다. */
  onSearch: (value: string) => void;
  placeholder?: string;
  /** 기본 300ms. 목록이 무거우면 늘린다. */
  delayMs?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * debounce 가 걸린 목록 검색칸.
 *
 * **왜 컴포넌트인가**: 타자 한 글자마다 요청을 보내면 목록 하나 찾는 데 열 번을 부른다.
 * 그래서 debounce 가 필요한데, 그건 *"입력 중인 글자"* 와 *"확정된 검색어"* 를 나누는
 * 상태를 요구한다. 목록마다 그 한 쌍을 다시 만들면 지연 시간도 초기화 규칙도 조금씩
 * 달라진다 — 실제로 `UserTableFilters` 안에 한 벌이 갇혀 있어, 다음 목록은 그것을
 * 복사하는 수밖에 없었다.
 *
 * **바깥 값이 바뀌면 따라간다**(뒤로 가기·필터 초기화). 그때 `onSearch` 를 되쏘지 않는
 * 것이 요점이다 — 되쏘면 URL 상태 → 입력 → URL 상태 로 도는 고리가 생긴다.
 */
export function SearchInput({
  value,
  onSearch,
  placeholder = '검색...',
  delayMs = 300,
  className,
  'aria-label': ariaLabel,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);

  // 바깥이 바뀌면 입력칸을 맞춘다. `onSearch` 는 부르지 않는다(고리 방지).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onSearch(draft), delayMs);
    return () => clearTimeout(timer);
    // 의존성에 `onSearch` 를 **일부러 넣지 않았다.** 대개 인라인 함수라 매 렌더 새
    // 참조이고, 넣으면 타자마다가 아니라 **렌더마다** 타이머가 초기화되어 debounce 가
    // 무의미해진다.
  }, [draft, value, delayMs]);

  return (
    <Input
      type="search"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className={className}
    />
  );
}
