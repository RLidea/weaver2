import { Controller, Get, Res, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { join } from 'path';

@ApiTags('Static')
@Controller('static')
@Public()
export class StaticController {
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
      'apps/core/src/assets/shared',
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
      'apps/core/src/assets/shared/components',
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
