import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { TermsService } from '../services/terms.service';

@ApiTags('Terms')
@Controller({ path: 'terms', version: '1' })
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Public()
  @Get('latest')
  @ApiOperation({ summary: 'Get the latest terms and conditions' })
  @ApiStandardResponses()
  async getLatestTerms() {
    return this.termsService.getLatestTerms();
  }
}
