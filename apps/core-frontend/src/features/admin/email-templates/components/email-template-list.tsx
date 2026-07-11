'use client';

import { useState } from 'react';
import { useAdminEmailTemplates } from '../hooks/use-admin-email-templates';
import { useUpdateEmailTemplate } from '../hooks/use-admin-email-template-mutations';
import { Button, Input, Spinner, useToast } from '@weaver2/ui';
import { ApiError } from '@/types/api';
import type { EmailTemplate } from '../types';

const TEMPLATE_LABELS: Record<string, string> = {
  'welcome': '회원가입 환영',
  'email-verification': '이메일 인증',
  'password-reset': '비밀번호 재설정',
  'two-factor-code': '2단계 인증 코드',
  'email-change': '이메일 변경 인증',
};

function TemplateRow({ template }: { template: EmailTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [htmlContent, setHtmlContent] = useState(template.htmlContent);
  const [textContent, setTextContent] = useState(template.textContent ?? '');
  const [isActive, setIsActive] = useState(template.isActive);

  const { mutate: update, isPending } = useUpdateEmailTemplate();
  const toast = useToast();

  function handleSave() {
    update(
      { id: template.id, body: { subject, htmlContent, textContent: textContent || undefined, isActive } },
      {
        onSuccess: () => {
          toast.success('템플릿이 저장되었습니다.');
          setExpanded(false);
        },
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : '저장에 실패했습니다.';
          toast.error(message);
        },
      },
    );
  }

  function handleCancel() {
    setSubject(template.subject);
    setHtmlContent(template.htmlContent);
    setTextContent(template.textContent ?? '');
    setIsActive(template.isActive);
    setExpanded(false);
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-text">
              {TEMPLATE_LABELS[template.name] ?? template.name}
            </p>
            <p className="text-xs text-text-muted">{template.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isActive
                ? 'bg-success/10 text-success'
                : 'bg-border/50 text-text-muted'
            }`}
          >
            {isActive ? '활성' : '비활성'}
          </span>
          <span className="text-xs text-text-muted">{expanded ? '닫기 ▲' : '수정 ▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-text w-16 shrink-0">활성화</label>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${isActive ? 'bg-primary' : 'bg-border'}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <Input
              label="제목"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text">HTML 본문</label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={10}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {template.variables && template.variables.length > 0 && (
                <p className="text-xs text-text-muted">
                  사용 가능한 변수: {template.variables.map((v) => `{{${v}}}`).join(', ')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text">텍스트 본문 (선택)</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={4}
                placeholder="HTML을 지원하지 않는 이메일 클라이언트용 텍스트 버전"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={handleCancel} disabled={isPending}>
                취소
              </Button>
              <Button onClick={handleSave} isLoading={isPending}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailTemplateList() {
  const { data: templates, isLoading, error } = useAdminEmailTemplates();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-error">템플릿을 불러오지 못했습니다.</p>
    );
  }

  if (!templates?.length) {
    return <p className="text-sm text-text-muted">등록된 이메일 템플릿이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {templates.map((t) => (
        <TemplateRow key={t.id} template={t} />
      ))}
    </div>
  );
}
