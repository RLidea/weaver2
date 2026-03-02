import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'error', 'success', 'warning'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    children: { control: 'text' },
  },
  args: {
    children: 'Badge',
    variant: 'default',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const Primary: Story = {
  args: { variant: 'primary', children: 'NEW' },
};

export const Error: Story = {
  args: { variant: 'error', children: '오류' },
};

export const Success: Story = {
  args: { variant: 'success', children: '성공' },
};

export const Warning: Story = {
  args: { variant: 'warning', children: '주의' },
};

export const SmallNumeric: Story = {
  name: 'Small (알림 수)',
  args: { size: 'sm', variant: 'error', children: '9' },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">기본</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="error">오류</Badge>
      <Badge variant="success">성공</Badge>
      <Badge variant="warning">주의</Badge>
    </div>
  ),
};
