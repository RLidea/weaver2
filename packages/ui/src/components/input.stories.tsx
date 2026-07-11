import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    helperText: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    placeholder: '입력하세요',
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    label: '이메일',
    placeholder: 'example@email.com',
  },
};

export const WithHelperText: Story = {
  args: {
    label: '비밀번호',
    placeholder: '8자 이상 입력',
    helperText: '영문, 숫자, 특수문자 포함 8자 이상',
  },
};

export const WithError: Story = {
  args: {
    label: '이메일',
    placeholder: 'example@email.com',
    defaultValue: 'invalid-email',
    error: '올바른 이메일 형식이 아닙니다',
  },
};

export const Disabled: Story = {
  args: {
    label: '이메일 (변경 불가)',
    defaultValue: 'user@example.com',
    disabled: true,
  },
};
