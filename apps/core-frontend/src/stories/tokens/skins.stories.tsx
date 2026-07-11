import type { Meta, StoryObj } from '@storybook/react';
import { type SkinId, SKINS } from '@weaver2/ui';

const COLOR_TOKENS = [
  { cls: 'bg-bg',         label: 'bg',         var: '--skin-bg',         desc: '페이지 배경' },
  { cls: 'bg-surface',    label: 'surface',     var: '--skin-surface',    desc: '카드/패널' },
  { cls: 'bg-surface-2',  label: 'surface-2',   var: '--skin-surface-2',  desc: '중첩 패널' },
  { cls: 'bg-border',     label: 'border',      var: '--skin-border',     desc: '테두리' },
  { cls: 'bg-primary',    label: 'primary',     var: '--skin-primary',    desc: '브랜드' },
  { cls: 'bg-text',       label: 'text',        var: '--skin-text',       desc: '본문' },
  { cls: 'bg-text-muted', label: 'text-muted',  var: '--skin-text-muted', desc: '보조 텍스트' },
  { cls: 'bg-error',      label: 'error',       var: '--skin-error',      desc: '오류' },
  { cls: 'bg-success',    label: 'success',     var: '--skin-success',    desc: '성공' },
  { cls: 'bg-warning',    label: 'warning',     var: '--skin-warning',    desc: '경고' },
];

function SkinCard({ id, label }: { id: SkinId; label: string }) {
  return (
    <div
      data-skin={id}
      className="flex-1 min-w-64 rounded-xl border border-border bg-surface p-6 space-y-4"
    >
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-text">{label}</span>
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-muted">
            [data-skin=&quot;{id}&quot;]
          </code>
        </div>
      </div>

      {/* 컬러 스워치 */}
      <div className="space-y-2">
        {COLOR_TOKENS.map((t) => (
          <div key={t.var} className="flex items-center gap-3">
            <div className={`${t.cls} h-8 w-8 flex-shrink-0 rounded-md border border-border`} />
            <div className="min-w-0">
              <code className="text-xs font-medium text-text">{t.label}</code>
              <p className="text-xs text-text-muted truncate">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkinsOverview() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text">스킨 목록</h1>
        <p className="mt-1 text-sm text-text-muted">
          현재 등록된 스킨과 각 스킨의 색상 토큰입니다.
          런타임에서 <code className="text-text">document.documentElement.setAttribute(&apos;data-skin&apos;, id)</code>로 전환됩니다.
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        {SKINS.map((skin) => (
          <SkinCard key={skin.id} id={skin.id} label={skin.label} />
        ))}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Tokens/Skins',
  component: SkinsOverview,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Overview: Story = {
  name: 'Skin Overview',
  render: () => <SkinsOverview />,
};
