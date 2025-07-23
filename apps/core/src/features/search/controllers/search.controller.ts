import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchRequestDto } from '../dto/search-request.dto';
import { SearchResultDto } from '../dto/search-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';

@ApiTags('Search')
@Controller({ path: 'search', version: '1' })
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: '통합 검색 - 게시글과 댓글을 검색합니다',
    description: `
    PostgreSQL Full-text Search를 활용한 통합 검색 기능입니다.
    
    검색 범위:
    - 게시글: 제목, 내용, 작성자명
    - 댓글: 내용, 작성자명
    
    검색 결과는 관련도와 조회수 순으로 정렬됩니다.
    `,
  })
  @ApiStandardResponses({
    type: SearchResultDto,
    description: '검색 결과와 각 타입별 총 개수',
  })
  async search(@Query() searchDto: SearchRequestDto): Promise<SearchResultDto> {
    return this.searchService.search(searchDto);
  }
}
