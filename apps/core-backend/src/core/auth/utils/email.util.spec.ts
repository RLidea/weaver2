import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { normalizeEmail } from './email.util';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';

describe('normalizeEmail', () => {
  it('앞뒤 공백을 지우고 소문자로 바꾼다', () => {
    expect(normalizeEmail('  Victim@Example.COM ')).toBe('victim@example.com');
  });

  it('% · _ 는 그대로 둔다 (정확 일치 비교라 와일드카드가 아니다)', () => {
    expect(normalizeEmail('A_B%@X.com')).toBe('a_b%@x.com');
  });
});

describe('@NormalizeEmail() 이 붙은 DTO', () => {
  it('검증 전에 소문자로 바꾼다', async () => {
    const dto = plainToInstance(RequestPasswordResetDto, {
      email: ' Owner@Example.COM ',
    });

    expect(dto.email).toBe('owner@example.com');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('가입 DTO 의 이메일도 소문자로 바뀐다', () => {
    const dto = plainToInstance(EmailSignUpDto, { email: 'New@User.IO' });
    expect(dto.email).toBe('new@user.io');
  });

  it('문자열이 아니면 건드리지 않아 검증이 거절한다', async () => {
    const dto = plainToInstance(RequestPasswordResetDto, { email: 42 });

    expect(dto.email).toBe(42);
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
