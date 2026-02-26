/* eslint-disable */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

export const AuthUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  if (request.user) {
    return {
      id: request.user.sub || request.user.id,
      username: request.user.username,
      isLogin: request.user.isLogin,
      totpEnabled: request.user.totpEnabled,
      emailOtpEnabled: request.user.emailOtpEnabled,
      userSetting: request.user.userSetting,
    };
  } else {
    return undefined;
  }
});
