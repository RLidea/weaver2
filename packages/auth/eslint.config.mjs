// 앱의 ESLint 설정을 재수출 — flat config는 config 파일 기준 base path 안의 파일만 대상이라
// 패키지마다 이 파일이 필요하다
import config from '../../apps/core-frontend/eslint.config.mjs';

export default config;
