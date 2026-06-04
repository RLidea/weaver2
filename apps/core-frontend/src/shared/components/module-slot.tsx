'use client';

import { Fragment } from 'react';
import { SLOT_REGISTRY, type SlotName } from './slot-registry.generated';

/**
 * 슬롯에 등록된 모듈 컴포넌트들을 렌더한다.
 * 빈 슬롯(설치된 모듈 없음)이면 아무것도 그리지 않는다.
 * 대시보드 등 공용 UI는 슬롯 이름만 알 뿐 어떤 모듈이 꽂힐지 모른다.
 */
export function ModuleSlot({ name }: { name: SlotName }) {
  const entries = SLOT_REGISTRY[name] ?? [];
  return (
    <>
      {entries.map((entry, i) => (
        <Fragment key={i}>{entry()}</Fragment>
      ))}
    </>
  );
}
