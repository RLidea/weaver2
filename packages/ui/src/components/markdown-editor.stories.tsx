import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownEditor } from './markdown-editor';

/** 스토리용 렌더러 — 실제로는 파생 프로젝트가 소독까지 하는 렌더러를 넣는다 */
async function renderAsEscapedText(markdown: string): Promise<string> {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre style="white-space: pre-wrap">${escaped}</pre>`;
}

/** 스토리는 값을 들고 있는 껍데기가 필요하다 — 편집기는 제어 컴포넌트다 */
function ControlledEditor({
  initialValue,
  renderPreview,
}: {
  initialValue: string;
  renderPreview: (markdown: string) => Promise<string>;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      renderPreview={renderPreview}
      placeholder="마크다운으로 쓰세요"
    />
  );
}

const meta: Meta<typeof MarkdownEditor> = {
  title: 'UI/MarkdownEditor',
  component: MarkdownEditor,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MarkdownEditor>;

export const Default: Story = {
  render: () => (
    <ControlledEditor
      initialValue={'# 제목\n\n본문을 쓰면 잠시 뒤 미리보기가 바뀝니다.'}
      renderPreview={renderAsEscapedText}
    />
  ),
};

export const PreviewFails: Story = {
  render: () => (
    <ControlledEditor
      initialValue="렌더러가 실패하면 오류 문구가 보입니다."
      renderPreview={() => Promise.reject(new Error('렌더 실패'))}
    />
  ),
};
