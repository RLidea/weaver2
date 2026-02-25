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
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating payload: ${JSON.stringify(payload)}`);
    const user = await FindUserByIdQuery(this.prisma, payload.sub);
    this.logger.debug(`User from findUserById: ${JSON.stringify(user?.id)}`);
    if (!user) {
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
