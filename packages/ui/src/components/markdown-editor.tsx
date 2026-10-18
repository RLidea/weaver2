'use client';

import { useEffect, useEffectEvent, useId, useState } from 'react';
import { cn } from '../lib/cn';
import { Tabs } from './tabs';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * 마크다운을 HTML 로 바꾼다. **소독은 이 함수의 책임이다** — 편집기는 돌려받은 HTML 을
   * 그대로 꽂는다. 공개 화면과 같은 함수를 넣어야 미리보기와 공개 화면이 같은 소독을 거친다.
   */
  renderPreview: (markdown: string) => Promise<string>;
  /** 미리보기 본문에 붙일 className (공개 화면의 본문 스타일을 그대로 입힐 때) */
  previewClassName?: string;
  className?: string;
  placeholder?: string;
}

type Pane = 'write' | 'preview';

const PANES = [
  { id: 'write' as const, label: '입력' },
  { id: 'preview' as const, label: '미리보기' },
];

/** 마지막 입력 뒤 이만큼 쉬면 미리보기를 다시 그린다 */
const PREVIEW_DELAY_MS = 300;

/**
 * 마크다운 입력과 미리보기. 넓은 화면에서는 나란히, 좁은 화면에서는 탭으로 하나씩 보인다.
 * 마크다운 렌더러를 품지 않는다 — renderPreview 로 주입받는다.
 */
export function MarkdownEditor({
  value,
  onChange,
  renderPreview,
  previewClassName,
  className,
  placeholder,
}: MarkdownEditorProps) {
  const inputId = useId();
  const [pane, setPane] = useState<Pane>('write');
  const [preview, setPreview] = useState<{ html: string; failed: boolean }>({
    html: '',
    failed: false,
  });

  // 호출자가 renderPreview 를 렌더마다 새로 만들어도 미리보기를 다시 그리지 않게 한다
  const render = useEffectEvent((markdown: string) => renderPreview(markdown));

  useEffect(() => {
    // 늦게 도착한 옛 결과가 새 결과를 덮지 않게, 정리된 요청의 결과는 버린다
    let stale = false;
    const timer = setTimeout(() => {
      render(value).then(
        (html) => {
          if (!stale) setPreview({ html, failed: false });
        },
        () => {
          if (!stale) setPreview((current) => ({ ...current, failed: true }));
        },
      );
    }, PREVIEW_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Tabs items={PANES} activeId={pane} onChange={setPane} className="md:hidden" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cn(pane !== 'write' && 'hidden', 'md:block')}>
          <label htmlFor={inputId} className="sr-only">
            마크다운 입력
          </label>
          <textarea
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className={cn(
              'h-full min-h-80 w-full resize-y rounded-md border border-border bg-surface px-3 py-2',
              'font-mono text-sm leading-relaxed text-text placeholder:text-text-muted',
              'outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary',
            )}
          />
        </div>
        <div
          className={cn(
            pane !== 'preview' && 'hidden',
            'md:block min-h-80 overflow-auto rounded-md border border-border bg-surface px-4 py-3',
          )}
          aria-label="미리보기"
          aria-live="polite"
        >
          {preview.failed && (
            <p role="alert" className="mb-2 text-sm text-error">
              미리보기를 만들지 못했습니다. 마지막으로 성공한 미리보기를 보여 줍니다.
            </p>
          )}
          <div
            className={previewClassName}
            // renderPreview 가 소독한 HTML 이다 (props 주석 참고)
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </div>
      </div>
    </div>
  );
}
