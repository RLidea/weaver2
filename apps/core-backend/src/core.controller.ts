import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CoreService } from './core.service';
import { Public } from '@weaver2/common/decorator/public.decorator';

@ApiExcludeController()
@Controller()
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Public()
  @Get()
  index(): string {
    return this.coreService.index();
  }
}
