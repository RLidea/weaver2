import { Body, Controller, Delete, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { TwoFactorService } from '../services/two-factor.service';
import { SignInService } from '../services/sign-in.service';
import { TwoFactorAuthenticateDto } from '../dto/two-factor-authenticate.dto';
import { TwoFactorConfirmDto } from '../dto/two-factor-confirm.dto';
import { TwoFactorSendEmailDto } from '../dto/two-factor-send-email.dto';
import { setAuthCookies } from '../utils/auth-cookie.util';

@ApiTags('Auth - Two Factor')
@Controller({ path: 'auth/2fa', version: '1' })
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly signInService: SignInService,
    private readonly configService: ConfigService,
  ) {}

  private get isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  // ─────────────────────────────────────────
  // Public endpoints (pre-auth token 기반)
  // ─────────────────────────────────────────

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('authenticate')
  @ApiOperation({ summary: 'pre-auth 토큰 + 2FA 코드로 최종 로그인' })
  async authenticate(
    @Body() dto: TwoFactorAuthenticateDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, rememberMe } = await this.twoFactorService.authenticate(
      dto.preAuthToken,
      dto.method,
      dto.code,
    );

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const tokens = await this.signInService.login(
      userId,
      'email',
      rememberMe,
      ipAddress,
      userAgent,
    );
    setAuthCookies(res, tokens, this.isProduction);

    // 토큰은 HttpOnly 쿠키로만 전달한다(응답 body에 평문 노출 금지).
    return { message: 'Login successful' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('email/send')
  @ApiOperation({
    summary: '로그인용 Email OTP 코드 발송 (pre-auth 토큰 필요)',
  })
  async sendEmailOtp(@Body() dto: TwoFactorSendEmailDto) {
    const { userId } = this.twoFactorService.verifyPreAuthToken(
      dto.preAuthToken,
    );
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

  @Get('totp/setup')
  @ApiOperation({ summary: 'TOTP 설정 시작 - 시크릿 및 QR 코드 반환' })
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
