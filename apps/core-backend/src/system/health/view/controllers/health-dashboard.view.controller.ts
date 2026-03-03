import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { join } from 'path';

@ApiExcludeController()
@Controller('health')
@Public()
export class HealthDashboardViewController {
  @Get('/')
  toDashboard(@Res() res: Response) {
    return res.redirect('/health/dashboard');
  }

  @Get('/dashboard')
  dashboard(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core-backend/src/assets/health/dashboard.html',
    );
    return res.sendFile(filePath);
  }

  @Get('/dashboard.js')
  dashboardJs(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core-backend/src/assets/health/dashboard.js',
    );
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(filePath);
  }

  @Get('/dashboard.css')
  dashboardCss(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core-backend/src/assets/health/dashboard.css',
    );
    res.setHeader('Content-Type', 'text/css');
    return res.sendFile(filePath);
  }
}
