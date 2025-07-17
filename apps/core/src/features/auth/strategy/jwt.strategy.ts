import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SignInService } from '../services/sign-in.service';
import { JwtPayload } from './jwt-payload.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private signInService: SignInService,
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
    const user = await this.signInService.validateUserById(
      payload.sub,
      payload.authId,
    );
    this.logger.debug(`User from validateUserById: ${JSON.stringify(user)}`);
    // The returned value is attached to the request object as req.user
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      authId: payload.authId,
      isLogin: true,
      userSetting: user.userSetting ?? undefined,
    };
  }
}
