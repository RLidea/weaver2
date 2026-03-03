'use client';

import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { useCreateTerms } from '@/core/terms/hooks/use-terms-mutations';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminTermsCreateModal({ open, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const { mutate, isPending } = useCreateTerms();

  const handleClose = () => {
    setTitle('');
    setContent('');
    setEffectiveAt('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !effectiveAt) return;
    mutate(
      { title: title.trim(), content: content.trim(), effectiveAt },
      { onSuccess: handleClose },
    );
  };

  return (
    <Modal open={open} onClose={handleClose} title="약관 등록" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="제목"
          placeholder="예: 서비스 이용약관"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
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
            placeholder="약관 내용을 입력하세요."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="submit"
            disabled={!title.trim() || !content.trim() || !effectiveAt}
            isLoading={isPending}
          >
            등록
          </Button>
        </div>
      </form>
    </Modal>
  );
}
