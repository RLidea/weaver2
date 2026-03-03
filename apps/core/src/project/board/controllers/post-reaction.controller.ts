import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReactionService } from '../services/reaction.service';
import { JwtAuthGuard } from '../../../features/auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { AddReactionDto } from '../dto/add-reaction.dto';
import { PostReactionsResponseDto } from '../dto/post-reactions-response.dto';
import { Public } from '@weaver2/common/decorator/public.decorator';

@ApiTags('Post Reaction')
@Controller({ path: 'posts', version: '1' })
@UseGuards(JwtAuthGuard)
export class PostReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Get(':postId/reactions')
  @Public()
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '게시글 리액션 조회',
    description: '이모지별 리액션 수와 현재 사용자의 반응 여부를 반환합니다.',
  })
  @ApiStandardResponses({ type: PostReactionsResponseDto })
  async getReactions(
    @Param('postId') postId: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<PostReactionsResponseDto> {
    return this.reactionService.getReactions(
      postId,
      authUser?.isLogin ? authUser.id : undefined,
    );
  }

  @Post(':postId/reactions')
  @ApiBearerAuth('ACCESS-TOKEN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '리액션 추가 (로그인 필요)' })
  @ApiStandardResponses({ type: PostReactionsResponseDto })
  async addReaction(
    @Param('postId') postId: string,
    @Body() dto: AddReactionDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<PostReactionsResponseDto> {
    return this.reactionService.addReaction(postId, authUser.id, dto.emojiId);
  }

  @Delete(':postId/reactions/:emojiId')
  @ApiBearerAuth('ACCESS-TOKEN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '리액션 취소 (로그인 필요)' })
  @ApiStandardResponses({ type: PostReactionsResponseDto })
  async removeReaction(
    @Param('postId') postId: string,
    @Param('emojiId') emojiId: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<PostReactionsResponseDto> {
    return this.reactionService.removeReaction(postId, authUser.id, emojiId);
  }
}
