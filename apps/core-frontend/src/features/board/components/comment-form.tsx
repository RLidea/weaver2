'use client';

import { useState } from 'react';
import { Button } from '@weaver2/ui';
import { useCreateComment } from '../hooks/use-comment-mutations';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  placeholder?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CommentForm({
  postId,
  parentId,
  placeholder = '댓글을 작성하세요.',
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const { mutate: createComment, isPending } = useCreateComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    createComment(
      { postId, content: trimmed, ...(parentId ? { parentId } : {}) },
      {
        onSuccess: () => {
          setContent('');
          onSuccess?.();
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={parentId ? 2 : 3}
        className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || isPending}
          isLoading={isPending}
        >
          {parentId ? '답글 작성' : '댓글 작성'}
        </Button>
      </div>
    </form>
  );
}
