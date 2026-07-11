'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@weaver2/ui';
import { useReactions, useAddReaction, useRemoveReaction } from '../hooks/use-reactions';
import { useEmojis } from '../hooks/use-emojis';

interface ReactionBarProps {
  postId: string;
}

export function ReactionBar({ postId }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { data: reactions } = useReactions(postId);
  const { data: emojis } = useEmojis();
  const { mutate: addReaction } = useAddReaction(postId);
  const { mutate: removeReaction } = useRemoveReaction(postId);

  // 피커 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  const handleReactionClick = (emojiId: string, reacted: boolean) => {
    if (reacted) {
      removeReaction(emojiId);
    } else {
      addReaction(emojiId);
    }
  };

  // 피커에서 이모지 클릭: 이미 반응했으면 제거, 아니면 추가
  const handlePickerSelect = (emojiId: string, reacted: boolean) => {
    if (reacted) {
      removeReaction(emojiId);
    } else {
      addReaction(emojiId);
    }
  };

  const reactedEmojiIds = new Set(
    reactions?.reactions.filter((r) => r.reacted).map((r) => r.emoji.id) ?? [],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 기존 리액션 버튼들 */}
      {reactions?.reactions.map((item) => (
        <button
          key={item.emoji.id}
          onClick={() => handleReactionClick(item.emoji.id, item.reacted)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
            item.reacted
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-surface-2 text-text hover:border-primary/50 hover:bg-primary/5',
          )}
        >
          <span>{item.emoji.unicode ?? item.emoji.code}</span>
          <span className="font-medium">{item.count}</span>
        </button>
      ))}

      {/* 이모지 추가 버튼 */}
      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setPickerOpen((prev) => !prev)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors',
            pickerOpen
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-surface-2 text-text-muted hover:bg-surface hover:text-text',
          )}
        >
          <span>+</span>
          <span>리액션</span>
        </button>

        {/* 이모지 피커 — 모든 이모지 표시, 이미 반응한 것은 하이라이트 */}
        {pickerOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 flex gap-1 rounded-lg border border-border bg-surface p-2 shadow-[var(--shadow-card)]">
            {emojis?.map((emoji) => {
              const reacted = reactedEmojiIds.has(emoji.id);
              return (
                <button
                  key={emoji.id}
                  onClick={() => handlePickerSelect(emoji.id, reacted)}
                  title={reacted ? `${emoji.name} 취소` : emoji.name}
                  className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-md text-xl transition-colors',
                    reacted
                      ? 'bg-primary/10 ring-1 ring-primary'
                      : 'hover:bg-surface-2',
                  )}
                >
                  {emoji.unicode ?? emoji.code}
                  {reacted && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-fg">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
