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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoardService } from '../services/board.service';
import { PostService } from '../services/post.service';
import { CreateBoardDto } from '../dto/create-board.dto';
import { UpdateBoardDto } from '../dto/update-board.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { BoardDto } from '../dto/board.dto';
import { PostDto } from '../dto/post.dto';
import { BoardPostsResponseDto } from '../dto/board-posts-response.dto';
import { KeysetRequestDto } from '@weaver2/pagination';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import {
  BoardPermissionService,
  BoardActionType,
} from '../services/board-permission.service';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';

@ApiTags('Board')
@Controller({ path: 'boards', version: '1' })
@UseGuards(JwtAuthGuard)
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly postService: PostService,
    private readonly permissionService: BoardPermissionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '게시판 생성 (관리자 전용)' })
  @ApiStandardResponses({ type: BoardDto })
  @RequirePermission(PERMISSIONS.BOARD.CREATE)
  async createBoard(@Body() createBoardDto: CreateBoardDto): Promise<BoardDto> {
    return this.boardService.createBoard(createBoardDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: '모든 게시판 조회' })
  @ApiStandardResponses({ type: BoardDto, isArray: true })
  async findAllBoards(): Promise<BoardDto[]> {
    return this.boardService.findAllBoards();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '특정 게시판 조회' })
  @ApiStandardResponses({ type: BoardDto })
  async findBoardById(
    @Param('id') id: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<BoardDto> {
    // 읽기 권한 체크
    await this.permissionService.requirePermission(
      id,
      BoardActionType.READ,
      authUser,
      '게시판 조회 권한이 없습니다.',
    );

    return this.boardService.findBoardById(id);
  }

  @Get(':boardId/posts')
  @Public()
  @ApiOperation({
    summary: '특정 게시판의 게시글 목록 조회 (preset으로 정렬 선택)',
  })
  @ApiStandardResponses({ type: PostDto, isArray: true })
  async getBoardPosts(
    @Param('boardId') boardId: string,
    @Query() keysetDto: KeysetRequestDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<BoardPostsResponseDto> {
    await this.permissionService.requirePermission(
      boardId,
      BoardActionType.READ,
      authUser,
      '게시판 읽기 권한이 없습니다.',
    );

    return this.postService.findPostsByBoardIdWithKeyset(
      boardId,
      keysetDto,
      authUser,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: '게시판 수정 (관리자 전용)' })
  @ApiStandardResponses({ type: BoardDto })
  @RequirePermission(PERMISSIONS.BOARD.UPDATE)
  async updateBoard(
    @Param('id') id: string,
    @Body() updateBoardDto: UpdateBoardDto,
  ): Promise<BoardDto> {
    return this.boardService.updateBoard(id, updateBoardDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게시판 삭제 (관리자 전용)' })
  @ApiStandardResponses({
    status: 204,
    description: 'Board deleted successfully',
  })
  @RequirePermission(PERMISSIONS.BOARD.DELETE)
  async deleteBoard(@Param('id') id: string): Promise<void> {
    await this.boardService.deleteBoard(id);
  }
}
