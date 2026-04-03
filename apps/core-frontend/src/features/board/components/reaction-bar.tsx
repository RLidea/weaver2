'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/shared/lib/cn';
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

  const handlePickerSelect = (emojiId: string) => {
    const alreadyReacted = reactions?.reactions.some(
      (r) => r.emoji.id === emojiId && r.reacted,
    );
    if (!alreadyReacted) {
      addReaction(emojiId);
    }
    setPickerOpen(false);
  };

  // 피커에서 보여줄 이모지 (아직 리액션 안 한 것만)
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
          className="flex items-center gap-1 rounded-full border border-border bg-surface-2 px-3 py-1 text-sm text-text-muted transition-colors hover:border-border hover:bg-surface hover:text-text"
        >
          <span>+</span>
          <span>리액션</span>
        </button>

        {/* 이모지 피커 */}
        {pickerOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-lg border border-border bg-surface p-2 shadow-[var(--shadow-card)]">
            {emojis
              ?.filter((emoji) => !reactedEmojiIds.has(emoji.id))
              .map((emoji) => (
                <button
                  key={emoji.id}
                  onClick={() => handlePickerSelect(emoji.id)}
                  title={emoji.name}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition-colors hover:bg-surface-2"
                >
                  {emoji.unicode ?? emoji.code}
                </button>
              ))}
            {emojis?.every((e) => reactedEmojiIds.has(e.id)) && (
              <span className="px-2 text-xs text-text-muted">모두 리액션했어요</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
