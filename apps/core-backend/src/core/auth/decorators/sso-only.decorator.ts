import { SetMetadata } from '@nestjs/common';
import { AUTH_MODE_ONLY_KEY } from './local-auth-only.decorator';

/** SSO 에만 있는 경로(OIDC start · callback) — `AUTH_MODE=local` 이면 404 `AUTH_MODE_LOCAL` */
export const SsoOnly = () => SetMetadata(AUTH_MODE_ONLY_KEY, 'sso');
