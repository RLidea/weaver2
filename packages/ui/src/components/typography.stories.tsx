import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from './typography';

const meta: Meta<typeof Typography> = {
  title: 'UI/Typography',
  component: Typography,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'body', 'body-sm', 'label', 'caption'],
    },
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'label'],
    },
    children: { control: 'text' },
  },
  args: {
    children: '텍스트 예시입니다',
    variant: 'body',
  },
};

export default meta;
type Story = StoryObj<typeof Typography>;

export const H1: Story = {
  args: { variant: 'h1', children: '페이지 제목 (H1)' },
};

export const H2: Story = {
  args: { variant: 'h2', children: '섹션 제목 (H2)' },
};

export const H3: Story = {
  args: { variant: 'h3', children: '서브섹션 제목 (H3)' },
};

export const H4: Story = {
  args: { variant: 'h4', children: '카드/패널 제목 (H4)' },
};

export const Body: Story = {
  args: { variant: 'body', children: '기본 본문 텍스트입니다. 일반적인 내용을 작성할 때 사용합니다.' },
};

export const BodySm: Story = {
  name: 'Body SM',
  args: { variant: 'body-sm', children: '작은 본문 텍스트입니다. 설명이나 부가 정보를 작성할 때 사용합니다.' },
};

export const Label: Story = {
  args: { variant: 'label', children: '폼 레이블' },
};

export const Caption: Story = {
  args: { variant: 'caption', children: '캡션 · 2026-03-02 · 힌트 텍스트' },
};

export const CustomTag: Story = {
  name: 'Custom Tag (variant="h1" as="h2")',
  args: { variant: 'h1', as: 'h2', children: 'h1 스타일이지만 h2 태그로 렌더링' },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-lg">
      <Typography variant="h1">H1 — 페이지 제목</Typography>
      <Typography variant="h2">H2 — 섹션 제목</Typography>
      <Typography variant="h3">H3 — 서브섹션 제목</Typography>
      <Typography variant="h4">H4 — 카드/패널 제목</Typography>
      <Typography variant="body">Body — 기본 본문 텍스트입니다. 이 스타일은 일반적인 내용에 사용합니다.</Typography>
      <Typography variant="body-sm">Body SM — 작은 본문 텍스트입니다. 설명이나 부가 정보에 사용합니다.</Typography>
      <Typography variant="label">Label — 폼 레이블</Typography>
      <Typography variant="caption">Caption — 캡션, 힌트, 타임스탬프</Typography>
    </div>
  ),
};
