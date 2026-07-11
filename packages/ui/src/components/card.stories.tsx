import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardContent, CardFooter } from './card';
import { Button } from './button';
import { Typography } from './typography';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    glass: { control: 'boolean' },
  },
  args: {
    glass: false,
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardContent>카드 내용입니다.</CardContent>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <Typography variant="h4">카드 제목</Typography>
      </CardHeader>
      <CardContent>카드 내용입니다.</CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardContent>카드 내용입니다.</CardContent>
      <CardFooter>
        <Typography variant="caption">마지막 수정: 2026-03-02</Typography>
      </CardFooter>
    </Card>
  ),
};

export const Full: Story = {
  name: 'Full (Header + Content + Footer)',
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <Typography variant="h4">로그인</Typography>
        <Typography variant="body-sm" className="text-text-muted mt-1">
          계정에 로그인하세요
        </Typography>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Typography variant="body">이메일과 비밀번호를 입력하세요.</Typography>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="secondary" size="sm">취소</Button>
        <Button variant="primary" size="sm">로그인</Button>
      </CardFooter>
    </Card>
  ),
};

export const Glass: Story = {
  args: { glass: true },
  render: (args) => (
    <div className="relative w-80 rounded-lg bg-gradient-to-br from-primary to-primary/50 p-1">
      <Card {...args} className="w-full">
        <CardContent>글래스 카드입니다.</CardContent>
      </Card>
    </div>
  ),
};
