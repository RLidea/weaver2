/* eslint-disable */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

export const AuthUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  if (request.user) {
    return {
      id: request.user.sub || request.user.id,
      username: request.user.username,
      role: request.user.role,
      authId: request.user.authId,
      isLogin: request.user.isLogin,
    };
  } else {
    return undefined;
  }
});
