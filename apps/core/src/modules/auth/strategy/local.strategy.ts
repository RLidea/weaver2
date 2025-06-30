import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { SignInService } from '../services/sign-in.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private signInService: SignInService) {
    super({ usernameField: 'email' });
  }

  validate(email: string, password: string) {
    return this.signInService.validateUserByEmail(email, password);
  }
}
