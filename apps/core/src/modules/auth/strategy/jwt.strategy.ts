import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from '../constant/jwt.constants';
import { SignInService } from '../services/sign-in.service';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private signInService: SignInService) {
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
      secretOrKey: jwtConstants.secret,
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
      username: user.username, // Includes id, username, displayName, role, etc.
      role: user.role,
      sub: payload.sub || user.id, // Ensure sub is always present
      iat: payload.iat,
      exp: payload.exp,
      isLogin: true,
    };
  }
}
