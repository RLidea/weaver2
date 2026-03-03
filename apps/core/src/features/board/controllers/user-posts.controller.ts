import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostService } from '../services/post.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { PostDto } from '../dto/post.dto';
import { KeysetRequestDto, KeysetResponseDto } from '@weaver2/pagination';
import { Public } from '@weaver2/common/decorator/public.decorator';

@ApiTags('User Posts')
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class UserPostsController {
  constructor(private readonly postService: PostService) {}

  @Get(':userId/posts')
  @Public()
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '특정 사용자가 작성한 게시글 목록 조회',
    description: '공개 게시글만 노출됩니다. 본인 요청 시 비밀글도 포함됩니다.',
  })
  @ApiStandardResponses({ type: PostDto, isArray: true })
  async findPostsByUserId(
    @Param('userId') userId: string,
    @Query() keysetDto: KeysetRequestDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    return this.postService.findPostsByUserId(userId, keysetDto, authUser);
  }
}
