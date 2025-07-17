import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@weaver2/prisma';
import { Public } from '@weaver2/common/decorator/public.decorator';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
@Public()
export class HealthCheckApiController {
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
}
