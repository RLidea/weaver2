import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { SignInService } from '../services/sign-in.service';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private signInService: SignInService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<CommonAuthUserDto> {
    const user = await this.signInService.validateUserByEmail(email, password);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      authId: user.authId,
      isLogin: true,
    };
  }
}
