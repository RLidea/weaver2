import { Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { SignOutService } from '../services/sign-out.service';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignOutController {
  constructor(private readonly signOutService: SignOutService) {}

  @Post('sign-out')
  @ApiOperation({ summary: 'Sign out and clear authentication cookies' })
  async signOut(
    @Res({ passthrough: true }) res: Response,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    try {
      await this.signOutService.signOut(authUser.authId);
    } finally {
      res.clearCookie('access_token');
    }
    return { message: 'Successfully signed out' };
  }
}
