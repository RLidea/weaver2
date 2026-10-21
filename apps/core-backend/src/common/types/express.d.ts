import { User } from '@weaver2/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: User; // Or your custom user type
      /** 범위 토큰으로 인증된 요청에만 있다 (JwtAuthGuard) */
      apiToken?: { id: string; scopes: string[] };
    }
  }
}
