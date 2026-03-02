import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  globalTypes: {
    skin: {
      description: '스킨 테마',
      defaultValue: 'default',
      toolbar: {
        title: 'Skin',
        icon: 'paintbrush',
        items: [
          { value: 'default', title: '라이트' },
          { value: 'dark', title: '다크' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const skin = (context.globals.skin as string) ?? 'default';
      return (
        <div data-skin={skin} className="bg-bg p-8 text-text min-h-screen">
          <Story />
        </div>
      );
    },
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
