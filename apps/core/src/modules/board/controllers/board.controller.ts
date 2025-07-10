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
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BoardService } from '../services/board.service';
import { CreateBoardDto } from '../dto/create-board.dto';
import { Roles } from '../../../decorator/roles.decorator';
import { BoardDto } from '../dto/board.dto';
import { UpdateBoardDto } from '../dto/update-board.dto';

@ApiTags('Boards')
@Controller({ path: 'boards', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '새 게시판 생성 (관리자 전용)' })
  @ApiStandardResponses({ type: BoardDto })
  async createBoard(@Body() createBoardDto: CreateBoardDto): Promise<BoardDto> {
    return this.boardService.createBoard(createBoardDto);
  }

  @Get()
  @ApiOperation({ summary: '모든 게시판 조회' })
  @ApiStandardResponses({ type: BoardDto, isArray: true })
  async findAllBoards(): Promise<BoardDto[]> {
    return this.boardService.findAllBoards();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 게시판 조회' })
  @ApiStandardResponses({ type: BoardDto })
  async findBoardById(@Param('id') id: string): Promise<BoardDto> {
    return this.boardService.findBoardById(id);
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
  @ApiOperation({ summary: '게시판 삭제 (관리자 전용)' })
  @ApiStandardResponses({ status: 204, description: '게시판 삭제 성공' })
  async deleteBoard(@Param('id') id: string): Promise<void> {
    await this.boardService.deleteBoard(id);
  }
}
