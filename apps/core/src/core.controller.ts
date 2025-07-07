import { Controller, Get } from '@nestjs/common';
import { CoreService } from './core.service';
import { Public } from '@weaver2/common/decorator/public.decorator';

@Controller()
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.coreService.getHello();
  }
}
