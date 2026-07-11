import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { StorybookConfig } from '@storybook/nextjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
    // @weaver2/ui 패키지의 stories 포함 (stories는 컴포넌트 옆에 유지)
    '../../../packages/ui/src/**/*.stories.@(ts|tsx)',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': resolve(__dirname, '../src'),
      };
    }
    return config;
  },
};

export default config;
