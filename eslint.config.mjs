// @ts-check
//
// 🔴 ESLint 는 9 에 묶여 있다 — 그리고 9.39.5 는 **deprecated 다**
//    ("This version is no longer supported", 9.x 의 마지막 판).
//    즉 앞으로 ESLint 에 취약점이 나와도 9.x 로는 고친 판이 안 온다.
//
// 왜 못 올리는가 (2026-09-15 실측):
//   10 으로 올리면 프론트 lint 가 통째로 크래시한다 —
//     TypeError: Error while loading rule 'react/display-name':
//       contextOrFilename.getFilename is not a function
//   ESLint 10 이 제거한 `context.getFilename()` 을 eslint-plugin-react 가 아직 부른다.
//   `eslint-config-next` 가 그 플러그인을 물고 오는데, 셋 다 최신이 eslint ^9 까지다:
//     eslint-plugin-react 7.37.5 · eslint-plugin-jsx-a11y 6.10.2 · eslint-plugin-import 2.32.0
//   즉 우리가 고칠 수 있는 자리가 아니다 — 위쪽이 판을 내야 한다.
//
// 백엔드만 10 으로 갈라 올리는 것도 검토했다가 접었다. 이 저장소는 판이 갈리는 것으로
// 이미 한 번 앓았고(react 두 벌 → 프리렌더 붕괴), 프론트가 9 에 남는 이상 얻는 것이 적다.
//
// 다시 시도할 신호: 위 세 플러그인 중 **eslint-plugin-react 가 eslint ^10 을 peer 로
// 받는 판을 내면.** 확인법: npm view eslint-plugin-react peerDependencies.eslint
// dependabot 이 주간으로 PR 을 올리므로, 그때 CI 가 대신 알려 줄 것이다.
//
// 참고: ESLint 10 으로 한 번 올려봤을 때 새 규칙 `preserve-caught-error` 가
// admin-security.api.service.ts 의 여섯 자리를 잡았다. 그 여섯은 이미 고쳐 두었으니
// (catch 에서 새 오류를 던질 때 `cause` 를 단다) 다음 시도 때는 안 나온다.
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'apps/core-frontend/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/return-await': ['error', 'in-try-catch']
    },
  },
);
