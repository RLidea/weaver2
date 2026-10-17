'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextValue {
  /** 데스크톱(md 이상) 펼침 여부 — localStorage 에 남는다 */
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  /** 모바일(md 미만) 서랍 열림 여부 — 남기지 않는다. 화면을 열 때마다 닫힌 채 시작한다 */
  isMobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
  /** 서랍을 여는 헤더 단추 — 서랍이 닫히면 초점을 여기로 돌려준다 */
  mobileTriggerRef: React.RefObject<HTMLButtonElement | null>;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = 'sidebar-open';
const DESKTOP_QUERY = '(min-width: 768px)'; // Tailwind md

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // 초기값: localStorage에서 복원, 없으면 true (데스크톱 기본 펼침)
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === 'true' : true;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // 경로가 바뀌면(링크 · 뒤로 가기 무엇이든) 서랍을 닫는다 — 렌더 중 상태 조정
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
  }

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'false');
  }, []);

  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  // 서랍이 열려 있는 동안: Esc 로 닫고, 뒤 페이지 스크롤을 막는다.
  // 닫히면(정리 함수) 스크롤을 돌려놓고 초점을 여는 단추로 돌려준다.
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    const trigger = mobileTriggerRef.current;
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      trigger?.focus();
    };
  }, [isMobileOpen]);

  // 화면이 md 이상으로 넓어지면 서랍을 닫는다 — 서랍은 모바일에만 있다
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMobileOpen(false);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <SidebarContext.Provider
      value={{ isOpen, toggle, close, isMobileOpen, toggleMobile, closeMobile, mobileTriggerRef }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
