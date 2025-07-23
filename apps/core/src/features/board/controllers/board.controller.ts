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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoardService } from '../services/board.service';
import { PostService } from '../services/post.service';
import { CreateBoardDto } from '../dto/create-board.dto';
import { UpdateBoardDto } from '../dto/update-board.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { BoardDto } from '../dto/board.dto';
import { PostDto } from '../dto/post.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';

@ApiTags('Board')
@Controller({ path: 'boards', version: '1' })
@UseGuards(JwtAuthGuard)
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly postService: PostService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new board' })
  @ApiStandardResponses({ type: BoardDto })
  async createBoard(@Body() createBoardDto: CreateBoardDto): Promise<BoardDto> {
    return this.boardService.createBoard(createBoardDto);
  }

  @Get()
  @ApiOperation({ summary: '모든 게시판 조회 (인증된 사용자)' })
  @ApiStandardResponses({ type: BoardDto, isArray: true })
  async findAllBoards(): Promise<BoardDto[]> {
    return this.boardService.findAllBoards();
  }

  @Get('public')
  @Public()
  @ApiOperation({
    summary: '공개 게시판 목록 조회 (비로그인 사용자 접근 가능)',
  })
  @ApiStandardResponses({ type: BoardDto, isArray: true })
  async findPublicBoards(): Promise<BoardDto[]> {
    return this.boardService.findPublicBoards();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 게시판 조회' })
  @ApiStandardResponses({ type: BoardDto })
  async findBoardById(@Param('id') id: string): Promise<BoardDto> {
    return this.boardService.findBoardById(id);
  }

  @Get(':boardId/posts')
  @Public()
  @ApiOperation({
    summary: '특정 게시판의 게시글 목록 조회 (공개 게시판은 비로그인 접근 가능)',
  })
  @ApiStandardResponses({ type: PostDto, isArray: true })
  async getBoardPosts(
    @Param('boardId') boardId: string,
    @Query() paginationDto: PaginationRequestDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<PaginationResponseDto<PostDto>> {
    return this.postService.findPostsByBoardIdWithPagination(
      boardId,
      paginationDto,
      authUser,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '게시판 수정 (관리자 전용)' })
  @ApiStandardResponses({ type: BoardDto })
  async updateBoard(
    @Param('id') id: string,
    @Body() updateBoardDto: UpdateBoardDto,
  ): Promise<BoardDto> {
    return this.boardService.updateBoard(id, updateBoardDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: 'Delete a board (Admin only)' })
  @ApiStandardResponses({
    status: 204,
    description: 'Board deleted successfully',
  })
  async deleteBoard(@Param('id') id: string): Promise<void> {
    await this.boardService.deleteBoard(id);
  }
}
