import { Controller, Get, Res, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@weaver2/prisma';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { join } from 'path';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memoryHealth: MemoryHealthIndicator,
    private diskHealth: DiskHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.memoryHealth.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memoryHealth.checkRSS('memory_rss', 150 * 1024 * 1024),
      () =>
        this.diskHealth.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.95,
        }),
    ]);
  }

  @Get('/ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('/live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  @ApiResponse({ status: 503, description: 'Application is not alive' })
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memoryHealth.checkHeap('memory_heap', 200 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get('/dashboard')
  @ApiOperation({ summary: 'Health dashboard HTML page' })
  @ApiResponse({ status: 200, description: 'Health dashboard page' })
  dashboard(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/public/health/dashboard.html',
    );
    return res.sendFile(filePath);
  }

  @Public()
  @Get('/dashboard.js')
  @ApiOperation({ summary: 'Health dashboard JavaScript file' })
  @ApiResponse({ status: 200, description: 'Health dashboard JavaScript' })
  dashboardJs(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/public/health/dashboard.js',
    );
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(filePath);
  }

  @Public()
  @Get('/dashboard.css')
  @ApiOperation({ summary: 'Health dashboard CSS file' })
  @ApiResponse({ status: 200, description: 'Health dashboard CSS' })
  dashboardCss(@Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/public/health/dashboard.css',
    );
    res.setHeader('Content-Type', 'text/css');
    return res.sendFile(filePath);
  }

  @Public()
  @Get('/shared/:type/:file')
  @ApiOperation({ summary: 'Shared components and styles' })
  @ApiResponse({ status: 200, description: 'Shared resources' })
  serveSharedFiles(
    @Param('type') type: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/public/shared',
      type,
      file,
    );

    if (file.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (file.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }

    return res.sendFile(filePath);
  }

  @Public()
  @Get('/shared/components/:component/:file')
  @ApiOperation({ summary: 'Shared component files' })
  @ApiResponse({ status: 200, description: 'Component files' })
  serveComponentFiles(
    @Param('component') component: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = join(
      process.cwd(),
      'apps/core/src/public/shared/components',
      component,
      file,
    );

    if (file.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (file.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }

    return res.sendFile(filePath);
  }
}
