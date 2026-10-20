import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { FindUserByIdQuery } from '../../user/repositories/find-user-by-id.query';
import { TOKEN_AUDIENCE } from './token-audience';
import { IsOidcSidRevokedQuery } from '../repositories/is-oidc-sid-revoked.query';

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
      // 액세스 토큰만 받는다. 같은 비밀로 서명된 pre-auth 토큰은 여기서 거절된다
      audience: TOKEN_AUDIENCE.ACCESS,
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating payload: ${JSON.stringify(payload)}`);
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

    /*
      back-channel 로그아웃이 끝낸 세션의 **이미 발급된 access token** 도 다음 요청에서 막는다.

      로그아웃은 refresh 행을 지우지만 access token(JWT)은 지울 수 없다. 여기서 막지 않으면
      만료(`JWT_EXPIRES_IN`)까지 그대로 통해, 발급자에서 로그아웃한 사람이 그 시간 동안 이 앱에서는
      로그인한 채로 남는다.

      - sub 만 온 로그아웃(그 사람 전부) — `users.sessionsRevokedAt` 보다 먼저 발급된 토큰을 거절한다.
        위에서 읽은 사용자 행의 값이라 DB 조회가 늘지 않는다. `iat` 는 초, `sessionsRevokedAt` 은 ms 라
        끊는 시각을 초로 내려 `iat < 그 초` 로 본다 — 끊은 **바로 그 초**에 발급된 토큰은 통과한다.
        끊은 뒤 곧바로 다시 로그인한 토큰을 거절하지 않으려고 그 1초 미만의 창을 받아들인다(그 토큰의
        refresh 행은 이미 지워졌으므로 만료 뒤에는 이어지지 않는다).
        `iat` 가 없는 토큰은 거절한다 — `jwtService.sign` 은 늘 `iat` 를 실으므로 우리가 발급한 토큰이
        아니거나 옛 꼴이고, 끊긴 사람에게서 언제 받은 것인지 알 수 없다.
      - sid 로그아웃(세션 하나) — 토큰에 sid 가 있을 때만(SSO 로그인 · 그 회전) 묘비를 PK 로 하나 읽는다.
        판단은 refresh 회전과 같다(IsOidcSidRevokedQuery).
    */
    if (user.sessionsRevokedAt) {
      const revokedAtSec = Math.floor(user.sessionsRevokedAt.getTime() / 1000);
      if (payload.iat === undefined || payload.iat < revokedAtSec) {
        this.logger.warn(
          `Access token from revoked sessions: user=${user.id} iat=${payload.iat ?? '-'} revokedAt=${user.sessionsRevokedAt.toISOString()}`,
        );
        return null;
      }
    }
    if (
      payload.sid &&
      (await IsOidcSidRevokedQuery(
        this.prisma,
        payload.sid,
        user.ssoSubject,
        new Date(),
      ))
    ) {
      this.logger.warn(
        `Access token from revoked SSO session: user=${user.id} sid=${payload.sid}`,
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
