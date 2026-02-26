import {
  Controller,
  Get,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { UserDto } from '../dto/user.dto';
import { FindUserService } from '../services/find-user.service';
import { DeleteAccountService } from '../services/delete-account.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateUserProfileService } from '../services/update-user-profile.service';
import { ChangePasswordService } from '../services/change-password.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateProfileService } from '../services/update-profile.service';
import { EmailChangeService } from '../services/email-change.service';
import { RequestEmailChangeDto } from '../dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from '../dto/confirm-email-change.dto';

@ApiTags('User Profile')
@Controller({ path: 'users/me', version: '1' })
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(
    private readonly findUserService: FindUserService,
    private readonly deleteAccountService: DeleteAccountService,
    private readonly updateUserProfileService: UpdateUserProfileService,
    private readonly changePasswordService: ChangePasswordService,
    private readonly updateProfileService: UpdateProfileService,
    private readonly emailChangeService: EmailChangeService,
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

  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 프로필 정보 수정' })
  @ApiStandardResponses({ status: 204, description: '프로필 정보 수정 성공' })
  async updateProfile(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    await this.updateProfileService.updateProfile(
      authUser.id,
      updateProfileDto,
    );
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiStandardResponses({
    status: 204,
    description: 'Password changed successfully',
  })
  async changePassword(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.changePasswordService.changePassword(
      authUser.id,
      changePasswordDto,
    );
  }

  @Post('email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '이메일 변경 요청 (인증 코드 발송)' })
  @ApiStandardResponses({ status: 204, description: '인증 코드 발송 완료' })
  async requestEmailChange(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() dto: RequestEmailChangeDto,
  ) {
    await this.emailChangeService.requestEmailChange(
      authUser.id,
      dto.currentPassword,
      dto.newEmail,
    );
  }

  @Post('email/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '이메일 변경 인증 코드 확인' })
  @ApiStandardResponses({ status: 204, description: '이메일 변경 완료' })
  async confirmEmailChange(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    await this.emailChangeService.confirmEmailChange(authUser.id, dto.code);
  }

  @Post('profile-image')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '프로필 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiStandardResponses()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          return cb(
            new BadRequestException('이미지 파일만 업로드할 수 있습니다.'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    const imageUrl = await this.updateUserProfileService.uploadProfileImage(
      authUser.id,
      file,
    );
    return { imageUrl };
  }
}
