import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { OAuthService } from '../oauth/oauth.service';
import { AuthProvidersResponseDto } from '../dto/auth-providers-response.dto';

@ApiTags('Auth')
@Controller({ path: 'auth/providers', version: '1' })
export class AuthProvidersController {
  constructor(private readonly oauthService: OAuthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '켜진 로그인 수단 조회',
    description:
      '로그인 화면이 버튼을 서버 설정에 맞춰 그리도록 쓴다. OAuth 는 서버에 등록된 provider 만 true.',
  })
  @ApiOkResponse({ type: AuthProvidersResponseDto })
  getProviders(): AuthProvidersResponseDto {
    return this.oauthService.getEnabledProviders();
  }
}
