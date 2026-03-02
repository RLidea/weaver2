import type { Meta, StoryObj } from '@storybook/react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <div className="rounded-lg border border-border bg-surface p-6">{children}</div>
    </div>
  );
}

function ShapeDocs() {
  return (
    <div className="w-full max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">형태 토큰</h1>
        <p className="mt-1 text-sm text-text-muted">
          반경, 그림자, 블러 등 형태 관련 토큰입니다. 모두 스킨 변수로 정의됩니다.
        </p>
      </div>

      <Section title="테두리 반경 (Border Radius)">
        <div className="flex flex-wrap gap-8">
          {[
            { cls: 'rounded-sm', label: 'rounded-sm', desc: '--skin-radius-sm · 0.25rem' },
            { cls: 'rounded-md', label: 'rounded-md', desc: '--skin-radius-md · 0.5rem' },
            { cls: 'rounded-lg', label: 'rounded-lg', desc: '--skin-radius-lg · 0.75rem' },
            { cls: 'rounded-full', label: 'rounded-full', desc: '9999px' },
          ].map(({ cls, label, desc }) => (
            <div key={cls} className="flex flex-col items-center gap-2">
              <div className={`${cls} h-16 w-16 bg-primary`} />
              <code className="text-xs text-text">{label}</code>
              <span className="text-center text-[10px] text-text-muted">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="그림자 (Shadow)">
        <div className="flex gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-20 w-36 items-center justify-center rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
              <span className="text-xs text-text-muted">shadow-card</span>
            </div>
            <code className="text-xs text-text-muted">shadow-[var(--shadow-card)]</code>
            <span className="text-[10px] text-text-muted">--skin-shadow-card</span>
          </div>
        </div>
      </Section>

      <Section title="배경 블러 (Backdrop Blur)">
        <div className="space-y-3">
          <div className="relative h-24 w-full overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg, var(--color-primary), #818cf8)' }}>
            <div className="absolute inset-4 flex items-center justify-center rounded-md border border-white/20 bg-white/15" style={{ backdropFilter: 'blur(12px)' }}>
              <span className="text-sm font-semibold text-white">Glass Card</span>
            </div>
          </div>
          <div className="rounded-md bg-surface-2 px-3 py-2">
            <code className="text-xs text-text-muted">
              {'// Card glass prop 사용'}
              <br />
              {'<Card glass>글래스 카드</Card>'}
              <br />
              {'// 현재 default 스킨: --skin-backdrop = 0px (블러 없음)'}
            </code>
          </div>
        </div>
      </Section>
    </div>
  );
}

const meta: Meta = {
  title: 'Tokens/Shape',
  component: ShapeDocs,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Tokens: Story = {
  name: 'Shape Tokens',
  render: () => <ShapeDocs />,
};
