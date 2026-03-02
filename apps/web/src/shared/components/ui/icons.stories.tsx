import type { Meta, StoryObj } from '@storybook/react';
import {
  HomeIcon,
  BoardIcon,
  BellIcon,
  SettingsIcon,
  MenuIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  XIcon,
  UserIcon,
  LogOutIcon,
  SearchIcon,
} from './icons';

const meta: Meta = {
  title: 'UI/Icons',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

const ICONS = [
  { name: 'HomeIcon', Component: HomeIcon },
  { name: 'BoardIcon', Component: BoardIcon },
  { name: 'BellIcon', Component: BellIcon },
  { name: 'SettingsIcon', Component: SettingsIcon },
  { name: 'MenuIcon', Component: MenuIcon },
  { name: 'ChevronDownIcon', Component: ChevronDownIcon },
  { name: 'ChevronLeftIcon', Component: ChevronLeftIcon },
  { name: 'XIcon', Component: XIcon },
  { name: 'UserIcon', Component: UserIcon },
  { name: 'LogOutIcon', Component: LogOutIcon },
  { name: 'SearchIcon', Component: SearchIcon },
];

export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-6">
      {ICONS.map(({ name, Component }) => (
        <div key={name} className="flex flex-col items-center gap-2 rounded-md border border-border p-4">
          <Component className="h-6 w-6 text-text" />
          <span className="text-xs text-text-muted">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-6">
      {(['h-3 w-3', 'h-4 w-4', 'h-5 w-5', 'h-6 w-6', 'h-8 w-8'] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <BellIcon className={`${size} text-text`} />
          <span className="text-xs text-text-muted">{size}</span>
        </div>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex gap-4">
      <BellIcon className="h-6 w-6 text-text" />
      <BellIcon className="h-6 w-6 text-primary" />
      <BellIcon className="h-6 w-6 text-error" />
      <BellIcon className="h-6 w-6 text-success" />
      <BellIcon className="h-6 w-6 text-warning" />
      <BellIcon className="h-6 w-6 text-text-muted" />
    </div>
  ),
};
