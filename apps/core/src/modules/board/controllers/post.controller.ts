import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostService } from '../services/post.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostDto } from '../dto/post.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

@ApiTags('Posts')
@Controller({ path: 'boards/:boardId/posts', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '새 게시글 생성' })
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
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiStandardResponses({ status: 204, description: '게시글 삭제 성공' })
  async deletePost(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.postService.deletePost(postId, authUser.id);
  }
}
