import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import {
  passwordHashFingerprint,
  SignInProof,
  SignInService,
} from '../services/sign-in.service';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

/** 비밀번호로 들어온 사람 — 맞춰 본 그 비밀번호를 로그인 끝(SignInService.login)까지 들고 간다 */
export interface LocalAuthUser extends CommonAuthUserDto {
  proof: Extract<SignInProof, { kind: 'password' }>;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private signInService: SignInService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<LocalAuthUser> {
    const user = await this.signInService.validateUserByEmail(email, password);
    // 맞춰 본 그 해시와 같은 행에서 읽은 값 — validateUserByEmail 은 자격이 없으면 거절한다
    const credential = user.localCredential!;
    return {
      id: user.id,
      username: user.username,
      isLogin: true,
      proof: {
        kind: 'password',
        changedAtMs: credential.passwordChangedAt.getTime(),
        hashFingerprint: passwordHashFingerprint(credential.passwordHash),
      },
    };
  }
}
