/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@weaver2/common/decorator/public.decorator';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../strategy/jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {
    super();
  }
  private logger = new Logger(JwtStrategy.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      const accessToken = context?.switchToHttp()?.getRequest()
        .cookies?.access_token;

      if (accessToken) {
        try {
          // accessToken 검증
          const payload = this.jwtService.verify(accessToken);

          // 검증된 사용자 정보를 request에 설정
          request['user'] = {
            ...payload,
            isLogin: true,
          };

          this.logger.debug('Token verified for public route:', payload);
        } catch (error) {
          this.logger.debug('Invalid token on public route:', error.message);

          // public 라우트에서는 토큰이 유효하지 않아도 접근 허용
          // 하지만 user 정보는 설정하지 않음
          request['user'] = {
            isLogin: false,
          };
        }
      } else {
        // 토큰이 없는 경우
        request['user'] = {
          isLogin: false,
        };
      }

      return true; // Skip JWT authentication for public routes
    }

    return super.canActivate(context);
  }
}
