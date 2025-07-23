import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostService } from '../services/post.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { PostDto } from '../dto/post.dto';

@ApiTags('Post')
@Controller({ path: 'boards/:boardId/posts', version: '1' })
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiStandardResponses({ type: PostDto })
  async createPost(
    @Param('boardId') boardId: string,
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostDto> {
    return this.postService.createPost(boardId, authUser.id, createPostDto);
  }

  @Get()
  @ApiOperation({ summary: '특정 게시판의 모든 게시글 조회' })
  @ApiStandardResponses({ type: PostDto, isArray: true })
  async findAllPostsByBoardId(
    @Param('boardId') boardId: string,
  ): Promise<PostDto[]> {
    return this.postService.findAllPostsByBoardId(boardId);
  }

  @Get(':postId')
  @ApiOperation({ summary: '특정 게시글 조회' })
  @ApiStandardResponses({ type: PostDto })
  async findPostById(@Param('postId') postId: string): Promise<PostDto> {
    return this.postService.findPostById(postId);
  }

  @Patch(':postId')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '게시글 수정' })
  @ApiStandardResponses({ type: PostDto })
  async updatePost(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostDto> {
    return this.postService.updatePost(postId, authUser.id, updatePostDto);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiStandardResponses({
    status: 204,
    description: 'Post deleted successfully',
  })
  async deletePost(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.postService.deletePost(postId, authUser.id);
  }
}
