'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Modal } from '@weaver2/ui';
import { useUpdateTerms } from '@/core/terms/hooks/use-terms-mutations';
import type { Terms } from '@/core/terms/types';

interface Props {
  terms: Terms | null;
  onClose: () => void;
}

export function AdminTermsEditModal({ terms, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const { mutate, isPending } = useUpdateTerms();

  useEffect(() => {
    if (terms) {
      setTitle(terms.title);
      setContent(terms.content);
      setEffectiveAt(terms.effectiveAt.split('T')[0]);
    }
  }, [terms]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) return;
    mutate(
      { id: terms.id, data: { title, content, effectiveAt } },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open={!!terms} onClose={onClose} title="약관 수정" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Input
          label="시행일"
          type="date"
          value={effectiveAt}
          onChange={(e) => setEffectiveAt(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" isLoading={isPending}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
