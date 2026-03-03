import type { Meta, StoryObj } from '@storybook/react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <div className="rounded-lg border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

function TypographyDocs() {
  return (
    <div className="w-full max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">타이포그래피 토큰</h1>
        <p className="mt-1 text-sm text-text-muted">
          Tailwind의 text-*, font-*, leading-*, tracking-* 클래스가 스킨 변수로 위임됩니다.
        </p>
      </div>

      <Section title="폰트 크기">
        <div className="space-y-3">
          {[
            { cls: 'text-xs', label: 'text-xs · 0.75rem · 12px', var: '--skin-font-size-xs' },
            { cls: 'text-sm', label: 'text-sm · 0.875rem · 14px', var: '--skin-font-size-sm' },
            { cls: 'text-base', label: 'text-base · 1rem · 16px', var: '--skin-font-size-base' },
            { cls: 'text-lg', label: 'text-lg · 1.125rem · 18px', var: '--skin-font-size-lg' },
            { cls: 'text-xl', label: 'text-xl · 1.25rem · 20px', var: '--skin-font-size-xl' },
            { cls: 'text-2xl', label: 'text-2xl · 1.5rem · 24px', var: '--skin-font-size-2xl' },
            { cls: 'text-3xl', label: 'text-3xl · 1.875rem · 30px', var: '--skin-font-size-3xl' },
            { cls: 'text-4xl', label: 'text-4xl · 2.25rem · 36px', var: '--skin-font-size-4xl' },
          ].map(({ cls, label }) => (
            <div key={cls} className="flex items-baseline gap-4">
              <code className="w-52 flex-shrink-0 text-xs text-text-muted">{label}</code>
              <span className={`${cls} text-text`}>가나다 ABC</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="폰트 굵기">
        <div className="space-y-2">
          {[
            { cls: 'font-normal', label: 'font-normal · 400', var: '--skin-font-weight-normal' },
            { cls: 'font-medium', label: 'font-medium · 500', var: '--skin-font-weight-medium' },
            { cls: 'font-semibold', label: 'font-semibold · 600', var: '--skin-font-weight-semibold' },
            { cls: 'font-bold', label: 'font-bold · 700', var: '--skin-font-weight-bold' },
          ].map(({ cls, label }) => (
            <div key={cls} className="flex items-center gap-4">
              <code className="w-44 flex-shrink-0 text-xs text-text-muted">{label}</code>
              <span className={`text-base ${cls} text-text`}>안녕하세요 Hello World</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="행간 (Line Height)">
        <div className="flex gap-8">
          {[
            { cls: 'leading-tight', label: 'tight · 1.25', var: '--skin-leading-tight' },
            { cls: 'leading-normal', label: 'normal · 1.5', var: '--skin-leading-normal' },
            { cls: 'leading-relaxed', label: 'relaxed · 1.625', var: '--skin-leading-relaxed' },
          ].map(({ cls, label }) => (
            <div key={cls} className="flex-1">
              <code className="text-xs text-text-muted">{label}</code>
              <p className={`mt-2 border-l-2 border-border pl-2 text-sm ${cls} text-text`}>
                {'첫 번째 줄\n두 번째 줄\n세 번째 줄'.split('\n').map((line, i) => (
                  <span key={i}>{line}<br /></span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="자간 (Letter Spacing)">
        <div className="space-y-3">
          {[
            { cls: 'tracking-tight', label: 'tracking-tight · -0.025em', var: '--skin-tracking-tight' },
            { cls: 'tracking-normal', label: 'tracking-normal · 0em', var: '--skin-tracking-normal' },
            { cls: 'tracking-wide', label: 'tracking-wide · 0.025em', var: '--skin-tracking-wide' },
          ].map(({ cls, label }) => (
            <div key={cls} className="flex items-center gap-4">
              <code className="w-52 flex-shrink-0 text-xs text-text-muted">{label}</code>
              <span className={`text-xl font-semibold ${cls} text-text`}>안녕하세요 Hello</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography 컴포넌트 variant 매핑">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-text-muted">variant</th>
                <th className="pb-2 text-left font-medium text-text-muted">기본 태그</th>
                <th className="pb-2 text-left font-medium text-text-muted">용도</th>
                <th className="pb-2 text-left font-medium text-text-muted">예시</th>
              </tr>
            </thead>
            <tbody>
              {[
                { v: 'h1', tag: 'h1', use: '페이지 제목', cls: 'text-4xl font-bold' },
                { v: 'h2', tag: 'h2', use: '섹션 제목', cls: 'text-3xl font-bold' },
                { v: 'h3', tag: 'h3', use: '서브섹션', cls: 'text-2xl font-semibold' },
                { v: 'h4', tag: 'h4', use: '카드 제목', cls: 'text-xl font-semibold' },
                { v: 'body', tag: 'p', use: '기본 본문', cls: 'text-base font-normal' },
                { v: 'body-sm', tag: 'p', use: '작은 본문', cls: 'text-sm font-normal' },
                { v: 'label', tag: 'span', use: '폼 레이블', cls: 'text-sm font-medium' },
                { v: 'caption', tag: 'span', use: '캡션/힌트', cls: 'text-xs text-text-muted' },
              ].map(({ v, tag, use, cls }) => (
                <tr key={v} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4"><code className="text-primary">{v}</code></td>
                  <td className="py-2 pr-4"><code className="text-text-muted">&lt;{tag}&gt;</code></td>
                  <td className="py-2 pr-4 text-text-muted">{use}</td>
                  <td className="py-2"><span className={`${cls} text-text`}>Aa 가나다</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

const meta: Meta = {
  title: 'Tokens/Typography',
  component: TypographyDocs,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Scale: Story = {
  name: 'Typography Scale',
  render: () => <TypographyDocs />,
};
