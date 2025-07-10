import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@weaver2/common/decorator/public.decorator';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {
    super();
  }
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      const accessToken = request.cookies?.access_token;

      if (accessToken) {
        try {
          const payload = this.jwtService.verify(accessToken);
          request['user'] = {
            id: payload.sub,
            authId: payload.authId,
            username: payload.username,
            role: payload.role,
            isLogin: true,
          };
          this.logger.debug(
            `Token verified for public route: ${JSON.stringify(payload)}`,
          );
        } catch (error) {
          this.logger.debug(`Invalid token on public route: ${error.message}`);
          request['user'] = { isLogin: false };
        }
      } else {
        request['user'] = { isLogin: false };
      }
      return true;
    }

    return super.canActivate(context);
  }
}
