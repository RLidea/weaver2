import { Controller, Get, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UserDto } from '../dto/user.dto';
import { FindUserService } from '../services/find-user.service';
import { DeleteAccountService } from '../services/delete-account.service';

@ApiTags('User Profile')
@Controller({ path: 'users/me', version: '1' })
export class UserProfileController {
  constructor(
    private readonly findUserService: FindUserService,
    private readonly deleteAccountService: DeleteAccountService,
  ) {}

  @Get()
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 정보 조회' })
  @ApiStandardResponses({ type: UserDto })
  async getProfile(@AuthUser() authUser: CommonAuthUserDto): Promise<UserDto> {
    return this.findUserService.findUserById(authUser.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 계정 탈퇴' })
  @ApiStandardResponses({ status: 204, description: '계정 탈퇴 성공' })
  async deleteMyAccount(@AuthUser() authUser: CommonAuthUserDto) {
    await this.deleteAccountService.execute(authUser.id);
  }
}
