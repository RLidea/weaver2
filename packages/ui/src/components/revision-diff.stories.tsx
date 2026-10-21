import type { Meta, StoryObj } from '@storybook/react';
import { RevisionDiff } from './revision-diff';

const meta: Meta<typeof RevisionDiff> = {
  title: 'UI/RevisionDiff',
  component: RevisionDiff,
  tags: ['autodocs'],
  args: {
    before: '# 제목\n\n첫 문단입니다.\n둘째 문단입니다.\n\n끝.',
    after: '# 제목\n\n첫 문단을 고쳤습니다.\n둘째 문단입니다.\n새로 넣은 문단입니다.\n\n끝.',
  },
};

export default meta;
type Story = StoryObj<typeof RevisionDiff>;

export const Default: Story = {};

export const Same: Story = {
  args: { before: '같은 본문', after: '같은 본문\n' },
};
