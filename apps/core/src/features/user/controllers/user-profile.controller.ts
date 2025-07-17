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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UpdateUserProfileService } from '../services/update-user-profile.service';
import * as fs from 'fs';
import { ChangePasswordService } from '../services/change-password.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateProfileService } from '../services/update-profile.service';

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
  @ApiStandardResponses({ status: 204, description: '비밀번호 변경 성공' })
  async changePassword(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.changePasswordService.changePassword(
      authUser.id,
      changePasswordDto,
    );
  }

  @Post('profile-image')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '자신의 프로필 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiStandardResponses()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const now = new Date();
          const year = now.getFullYear();
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const uploadPath = join(
            process.cwd(),
            'uploads',
            String(year),
            month,
          );

          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const imageUrl = `/uploads/${year}/${month}/${file.filename}`;
    await this.updateUserProfileService.updateProfileImage(
      authUser.id,
      imageUrl,
    );
    return { imageUrl };
  }
}
