'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SKIN, type SkinId } from '@/skins/index';

interface SkinContextValue {
  skin: SkinId;
  setSkin: (id: SkinId) => void;
}

const SkinContext = createContext<SkinContextValue>({
  skin: DEFAULT_SKIN,
  setSkin: () => {},
});

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>(DEFAULT_SKIN);

  // 클라이언트 마운트 시 localStorage 값으로 초기화
  useEffect(() => {
    const stored = localStorage.getItem('skin') as SkinId | null;
    if (stored && stored !== DEFAULT_SKIN) {
      setSkinState(stored);
      document.documentElement.setAttribute('data-skin', stored);
    }
  }, []);

  function setSkin(id: SkinId) {
    setSkinState(id);
    localStorage.setItem('skin', id);
    document.documentElement.setAttribute('data-skin', id);
  }

  return (
    <SkinContext.Provider value={{ skin, setSkin }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkin() {
  return useContext(SkinContext);
}
