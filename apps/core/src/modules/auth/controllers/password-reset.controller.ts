import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { RequestPasswordResetService } from '../services/request-password-reset.service';
import { ResetPasswordService } from '../services/reset-password.service';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth - Password')
@Controller('auth/password')
export class PasswordResetController {
  constructor(
    private readonly requestPasswordResetService: RequestPasswordResetService,
    private readonly resetPasswordService: ResetPasswordService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({
    status: 200,
    description:
      'A password reset link has been sent to the email address if it exists.',
  })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    await this.requestPasswordResetService.execute(dto);
    return {
      message:
        'A password reset link has been sent to the email address if it exists.',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with a token' })
  @ApiResponse({
    status: 200,
    description: 'Password has been successfully reset.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired password reset token.',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.resetPasswordService.execute(dto);
    return { message: 'Password has been successfully reset.' };
  }
}
