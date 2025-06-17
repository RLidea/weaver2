import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CallbackUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access
    return request.user;
  },
);
