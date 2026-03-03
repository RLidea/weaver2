import { Controller, Get, Res, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { join } from 'path';

@ApiExcludeController()
@Controller('static')
@Public()
export class StaticController {
  @Get('/shared/:type/:file')
  serveSharedFiles(
    @Param('type') type: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = join(
      process.cwd(),
      'apps/core-backend/src/assets/shared',
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
  serveComponentFiles(
    @Param('component') component: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = join(
      process.cwd(),
      'apps/core-backend/src/assets/shared/components',
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

  @Get('/admin/:type/:file')
  serveAdminAssets(
    @Param('type') type: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = join(
      process.cwd(),
      'apps/core-backend/src/assets/admin',
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
}
