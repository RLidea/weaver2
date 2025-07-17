import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { join } from 'path';

@ApiTags('Health Dashboard')
@Controller('health')
@Public()
export class HealthDashboardViewController {
  @Get('/dashboard')
  @ApiOperation({ summary: 'Health dashboard HTML page' })
  @ApiResponse({ status: 200, description: 'Health dashboard page' })
  dashboard(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/assets/health/dashboard.html',
    );
    return res.sendFile(filePath);
  }

  @Get('/dashboard.js')
  @ApiOperation({ summary: 'Health dashboard JavaScript file' })
  @ApiResponse({ status: 200, description: 'Health dashboard JavaScript' })
  dashboardJs(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/assets/health/dashboard.js',
    );
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(filePath);
  }

  @Get('/dashboard.css')
  @ApiOperation({ summary: 'Health dashboard CSS file' })
  @ApiResponse({ status: 200, description: 'Health dashboard CSS' })
  dashboardCss(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/assets/health/dashboard.css',
    );
    res.setHeader('Content-Type', 'text/css');
    return res.sendFile(filePath);
  }
}
