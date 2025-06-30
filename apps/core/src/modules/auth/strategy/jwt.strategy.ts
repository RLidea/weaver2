// jwt/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from '../constant/jwt.constants';
import { SignInService } from '../services/sign-in.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private signInService: SignInService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  validate(payload: any) {
    return this.signInService.validateUserById(payload.sub, payload.authId);
  }
}
