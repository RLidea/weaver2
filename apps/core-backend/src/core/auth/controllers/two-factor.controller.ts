import { Body, Controller, Delete, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { TwoFactorService } from '../services/two-factor.service';
import { TwoFactorAuthenticateDto } from '../dto/two-factor-authenticate.dto';
import { TwoFactorConfirmDto } from '../dto/two-factor-confirm.dto';
import {
  clearPreAuthCookie,
  readPreAuthCookie,
} from '../utils/auth-cookie.util';
import { ConfigService } from '@nestjs/config';
import { SignInCompletionService } from '../services/sign-in-completion.service';

@ApiTags('Auth - Two Factor')
@Controller({ path: 'auth/2fa', version: '1' })
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly signInCompletionService: SignInCompletionService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────
  // Public endpoints (pre_auth 쿠키 기반 — 비밀번호·OAuth 로그인이 남긴다)
  // ─────────────────────────────────────────

  @Public()
  @Get('pending')
  @ApiOperation({
    summary: '2FA 대기 중 고를 수 있는 수단 (pre_auth 쿠키 필요)',
  })
  async pending(@Req() req: Request) {
    const { userId } = this.twoFactorService.verifyPreAuthToken(
      readPreAuthCookie(req) ?? '',
    );
    return {
      availableMethods:
        await this.signInCompletionService.availableMethods(userId),
    };
  }

  @Public()
  @Delete('pending')
  @ApiOperation({
    summary: '2FA 단계를 그만둔다 — pre_auth 쿠키를 지운다',
    description:
      '2FA 대기 중인 브라우저에는 세션이 없어 로그아웃을 부를 수 없다. 「로그인 화면으로 돌아가기」가 이것을 부른다.',
  })
  abandon(@Res({ passthrough: true }) res: Response) {
    clearPreAuthCookie(
      res,
      this.configService.get('NODE_ENV') === 'production',
    );
    return { message: 'Two-factor step abandoned' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('authenticate')
  @ApiOperation({ summary: 'pre_auth 쿠키 + 2FA 코드로 최종 로그인' })
  async authenticate(
    @Body() dto: TwoFactorAuthenticateDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, rememberMe } = await this.twoFactorService.authenticate(
      readPreAuthCookie(req) ?? '',
      dto.method,
      dto.code,
    );

    // 탈퇴·정지를 다시 보고 세션을 준다 — pre-auth 5분 사이에 끼어들 수 있다
    await this.signInCompletionService.completeAfterTwoFactor(
      userId,
      {
        provider: 'two-factor',
        rememberMe,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      res,
    );

    // 토큰은 HttpOnly 쿠키로만 전달한다(응답 body에 평문 노출 금지).
    return { message: 'Login successful' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('email/send')
  @ApiOperation({
    summary: '로그인용 Email OTP 코드 발송 (pre_auth 쿠키 필요)',
  })
  async sendEmailOtp(@Req() req: Request) {
    const { userId, issuedAtMs } = this.twoFactorService.verifyPreAuthToken(
      readPreAuthCookie(req) ?? '',
    );
    // 로그인을 끝낸 토큰으로 코드 메일을 더 보내지 못하게
    await this.twoFactorService.assertPreAuthUnused(userId, issuedAtMs);
    await this.twoFactorService.sendEmailOtp(userId);
    return { message: 'Verification code sent' };
  }

  // ─────────────────────────────────────────
  // Authenticated endpoints (JWT 필요)
  // ─────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: '2FA 활성화 상태 조회' })
  async getStatus(@AuthUser() user: CommonAuthUserDto) {
    return this.twoFactorService.getStatus(user.id);
  }

  // 🔴 POST 다. 등록 시작은 상태를 바꾸므로(새 비밀을 쓴다) GET 이면 CSRF 검사를 받지
  //    않고, SameSite=Lax 쿠키는 다른 사이트의 링크 이동에도 실린다.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('totp/setup')
  @ApiOperation({
    summary: 'TOTP 설정 시작 - 시크릿 및 QR 코드 반환 (이미 켜져 있으면 409)',
  })
  async totpSetup(@AuthUser() user: CommonAuthUserDto) {
    return this.twoFactorService.generateTotpSetup(user.id);
  }

  @Post('totp/confirm')
  @ApiOperation({ summary: 'TOTP 코드 확인 후 활성화' })
  async totpConfirm(
    @AuthUser() user: CommonAuthUserDto,
    @Body() dto: TwoFactorConfirmDto,
  ) {
    await this.twoFactorService.confirmTotpSetup(user.id, dto.code);
    return { message: 'TOTP enabled successfully' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('email/setup')
  @ApiOperation({ summary: 'Email OTP 설정 시작 - 인증 코드 발송' })
  async emailSetup(@AuthUser() user: CommonAuthUserDto) {
    await this.twoFactorService.initiateEmailOtpSetup(user.id);
    return { message: 'Verification code sent to your email' };
  }

  @Post('email/confirm')
  @ApiOperation({ summary: 'Email OTP 코드 확인 후 활성화' })
  async emailConfirm(
    @AuthUser() user: CommonAuthUserDto,
    @Body() dto: TwoFactorConfirmDto,
  ) {
    await this.twoFactorService.confirmEmailOtpSetup(user.id, dto.code);
    return { message: 'Email OTP enabled successfully' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('step-up/send')
  @ApiOperation({
    summary: '민감한 동작(2FA 해제 등) 전 확인 코드를 이메일로 발송',
  })
  async sendStepUpCode(@AuthUser() user: CommonAuthUserDto) {
    await this.twoFactorService.sendStepUpCode(user.id);
    return { message: 'Verification code sent to your email' };
  }

  @Delete('totp')
  @ApiOperation({ summary: 'TOTP 비활성화 (다른 2FA 수단 존재 시에만 가능)' })
  async disableTotp(
    @AuthUser() user: CommonAuthUserDto,
    @Body() dto: TwoFactorConfirmDto,
  ) {
    await this.twoFactorService.disableTotp(user.id, dto.code);
    return { message: 'TOTP disabled successfully' };
  }

  @Delete('email')
  @ApiOperation({
    summary: 'Email OTP 비활성화 (다른 2FA 수단 존재 시에만 가능)',
  })
  async disableEmailOtp(
    @AuthUser() user: CommonAuthUserDto,
    @Body() dto: TwoFactorConfirmDto,
  ) {
    await this.twoFactorService.disableEmailOtp(user.id, dto.code);
    return { message: 'Email OTP disabled successfully' };
  }
}
