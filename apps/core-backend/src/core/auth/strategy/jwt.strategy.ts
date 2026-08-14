import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { FindUserByIdQuery } from '../../user/repositories/find-user-by-id.query';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
          const token = request?.cookies?.access_token;
          this.logger.debug(
            `Extracted token from cookie: ${token ? 'YES' : 'NO'}`,
          );
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback for Swagger or other API clients
        ExtractJwt.fromUrlQueryParameter('token'), // Fallback for SSE / mobile clients
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating payload: ${JSON.stringify(payload)}`);
    // pre-auth 토큰은 일반 인증 토큰으로 사용 불가
    if ((payload as unknown as Record<string, unknown>).type === 'pre-auth') {
      return null;
    }
    const user = await FindUserByIdQuery(this.prisma, payload.sub);
    this.logger.debug(`User from findUserById: ${JSON.stringify(user?.id)}`);
    if (!user) {
      return null;
    }

    /*
      정지된 계정은 **이미 발급된 토큰으로도** 들어오지 못한다.

      `sign-in.service.ts` 가 정지 계정의 새 로그인을 막고, `suspendUser` 가 세션을
      지운다. 그런데 그 둘만으로는 **이미 브라우저에 들어 있는 access token** 을 막지
      못한다 — 만료(기본 1시간)까지 그대로 통한다. 정지당한 사람이 열어둔 탭으로
      계속 일할 수 있다는 뜻이고, 그러면 「정지」라는 말이 거짓이 된다.

      `FindUserByIdQuery` 가 `deletedAt` 은 이미 거르므로 삭제는 여기서 즉시 막힌다.
      정지도 같은 무게로 본다.

      매 요청 DB 조회가 추가되지 않는 것이 요점이다 — 위에서 이미 사용자를 읽고 있고,
      여기서는 읽어온 값을 한 번 더 볼 뿐이다.
    */
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      this.logger.warn(
        `Suspended account attempted access: user=${user.id} until=${user.suspendedUntil.toISOString()}`,
      );
      return null;
    }
    // The returned value is attached to the request object as req.user
    return {
      id: user.id,
      username: user.username,
      isLogin: true,
      userSetting: user.userSetting ?? undefined,
    };
  }
}
