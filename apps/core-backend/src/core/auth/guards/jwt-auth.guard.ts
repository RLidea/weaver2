import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@weaver2/common/decorator/public.decorator';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';

interface JwtPayload {
  sub: string;
}

interface UserContext {
  id?: string;
  username?: string;
  isLogin: boolean;
}

interface RequestWithUser extends Request {
  user?: UserContext;
  cookies?: Record<string, string>;
}

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
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const accessToken = request.cookies?.access_token;

      if (accessToken) {
        try {
          const payload: JwtPayload = this.jwtService.verify(accessToken);
          request.user = {
            id: payload.sub,
            isLogin: true,
          };
          this.logger.debug(
            `Token verified for public route: ${JSON.stringify(payload)}`,
          );
        } catch (error) {
          this.logger.debug(
            `Invalid token on public route: ${(error as Error).message}`,
          );
          request.user = { isLogin: false };
        }
      } else {
        request.user = { isLogin: false };
      }
      return true;
    }

    return super.canActivate(context);
  }
}
