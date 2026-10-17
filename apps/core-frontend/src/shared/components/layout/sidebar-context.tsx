'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface SidebarContextValue {
  /** 데스크톱(md 이상) 펼침 여부 — localStorage 에 남는다 */
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  /** 모바일(md 미만) 서랍 열림 여부 — 남기지 않는다. 화면을 열 때마다 닫힌 채 시작한다 */
  isMobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = 'sidebar-open';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // 초기값: localStorage에서 복원, 없으면 true (데스크톱 기본 펼침)
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === 'true' : true;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  // 서랍이 열려 있는 동안만 Esc 로 닫는다
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider
      value={{ isOpen, toggle, close, isMobileOpen, toggleMobile, closeMobile }}
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
