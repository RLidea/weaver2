import type { Meta, StoryObj } from '@storybook/react';

const COLOR_TOKENS = [
  {
    group: '배경 & 표면',
    tokens: [
      { cls: 'bg-bg', label: 'bg-bg', desc: '페이지 배경', var: '--skin-bg' },
      { cls: 'bg-surface', label: 'bg-surface', desc: '카드/패널 배경', var: '--skin-surface' },
      { cls: 'bg-surface-2', label: 'bg-surface-2', desc: '중첩 패널 배경', var: '--skin-surface-2' },
      { cls: 'bg-border', label: 'border-border', desc: '기본 테두리', var: '--skin-border' },
    ],
  },
  {
    group: 'Primary (브랜드)',
    tokens: [
      { cls: 'bg-primary', label: 'bg-primary / text-primary', desc: '브랜드 컬러', var: '--skin-primary' },
      { cls: 'bg-primary-fg', label: 'text-primary-fg', desc: 'primary 위의 텍스트', var: '--skin-primary-fg' },
    ],
  },
  {
    group: '텍스트',
    tokens: [
      { cls: 'bg-text', label: 'text-text', desc: '본문 텍스트', var: '--skin-text' },
      { cls: 'bg-text-muted', label: 'text-text-muted', desc: '보조 텍스트', var: '--skin-text-muted' },
    ],
  },
  {
    group: '시맨틱',
    tokens: [
      { cls: 'bg-error', label: 'bg-error / text-error', desc: '오류', var: '--skin-error' },
      { cls: 'bg-success', label: 'bg-success / text-success', desc: '성공', var: '--skin-success' },
      { cls: 'bg-warning', label: 'bg-warning / text-warning', desc: '경고', var: '--skin-warning' },
    ],
  },
];

function ColorSwatch({ cls, label, desc, variable }: { cls: string; label: string; desc: string; variable: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`${cls} h-12 w-12 flex-shrink-0 rounded-lg border border-border`} />
      <div>
        <code className="text-sm font-medium text-text">{label}</code>
        <p className="text-xs text-text-muted">{desc} · <code>{variable}</code></p>
      </div>
    </div>
  );
}

function ColorPalette() {
  return (
    <div className="w-full max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">색상 토큰</h1>
        <p className="mt-1 text-sm text-text-muted">
          모든 색상은 스킨 CSS 변수로 정의됩니다. 스킨을 교체하면 일괄 변경됩니다.
        </p>
        <div className="mt-2 rounded-md bg-surface-2 px-3 py-2">
          <code className="text-xs text-text-muted">
            ✅ bg-surface text-text border-border &nbsp;&nbsp; ❌ bg-white text-gray-900
          </code>
        </div>
      </div>

      {COLOR_TOKENS.map(({ group, tokens }) => (
        <div key={group}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">{group}</h2>
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            {tokens.map((t) => (
              <ColorSwatch key={t.var} cls={t.cls} label={t.label} desc={t.desc} variable={t.var} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Tokens/Colors',
  component: ColorPalette,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {
  name: 'Color Palette',
  render: () => <ColorPalette />,
};
