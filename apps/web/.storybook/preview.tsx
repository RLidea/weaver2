import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div data-skin="default" className="bg-bg p-8 text-text">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
