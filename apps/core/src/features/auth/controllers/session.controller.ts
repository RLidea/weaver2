import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { SessionService } from '../services/session.service';

@ApiTags('Auth - Sessions')
@Controller({ path: 'auth/sessions', version: '1' })
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: '현재 유저의 활성 세션 목록 조회' })
  async listSessions(
    @AuthUser() authUser: CommonAuthUserDto,
    @Req() req: Request,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const currentToken = cookies?.refresh_token;
    const sessions = await this.sessionService.listSessions(
      authUser.id,
      currentToken,
    );
    return { message: 'Sessions retrieved successfully', data: sessions };
  }

  @Delete('others')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '현재 세션 제외 다른 모든 세션 삭제' })
  async revokeOtherSessions(
    @AuthUser() authUser: CommonAuthUserDto,
    @Req() req: Request,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const currentToken = cookies?.refresh_token;
    await this.sessionService.revokeOtherSessions(authUser.id, currentToken);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '특정 세션 삭제' })
  async revokeSession(
    @AuthUser() authUser: CommonAuthUserDto,
    @Param('id') sessionId: string,
  ) {
    await this.sessionService.revokeSession(authUser.id, sessionId);
  }
}
