/* eslint-disable */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  if (request.user) {
    const id: string = request.user.sub;
    const iat: string = request.user.iat;
    const exp: string = request.user.exp;
    return {
      id,
      iat,
      exp,
    };
  } else {
    return {};
  }
});
