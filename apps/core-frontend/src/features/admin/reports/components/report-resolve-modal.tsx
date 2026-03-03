'use client';

import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useResolveReport, useDismissReport } from '../hooks/use-admin-report-mutations';
import {
  REPORT_ACTION_LABELS,
  type Report,
  type ReportAction,
} from '../types';

interface Props {
  report: Report | null;
  onClose: () => void;
}

const ACTIONS: ReportAction[] = [
  'NO_ACTION',
  'WARN_USER',
  'HIDE_CONTENT',
  'DELETE_CONTENT',
  'SUSPEND_USER',
];

export function ReportResolveModal({ report, onClose }: Props) {
  const [actionTaken, setActionTaken] = useState<ReportAction>('NO_ACTION');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'resolve' | 'dismiss'>('resolve');

  const { mutate: resolve, isPending: isResolving } = useResolveReport();
  const { mutate: dismiss, isPending: isDismissing } = useDismissReport();
  const isPending = isResolving || isDismissing;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    if (mode === 'resolve') {
      resolve(
        { id: report.id, body: { actionTaken, moderatorNote: note.trim() || undefined } },
        { onSuccess: () => { setNote(''); onClose(); } },
      );
    } else {
      dismiss(
        { id: report.id, moderatorNote: note.trim() || undefined },
        { onSuccess: () => { setNote(''); onClose(); } },
      );
    }
  };

  return (
    <Modal open={!!report} onClose={onClose} title="신고 처리" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2 rounded-md border border-border bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setMode('resolve')}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'resolve' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            처리 완료
          </button>
          <button
            type="button"
            onClick={() => setMode('dismiss')}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'dismiss' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            기각
          </button>
        </div>

        {mode === 'resolve' && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-text">취한 조치</label>
            <select
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value as ReportAction)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {REPORT_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text">처리 메모 (선택)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="내부 메모를 입력하세요."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            maxLength={500}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" isLoading={isPending}>
            {mode === 'resolve' ? '처리 완료' : '기각'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
