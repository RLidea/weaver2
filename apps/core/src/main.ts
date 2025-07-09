import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { setNestApp } from '@weaver2/common/global/nest.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(CoreModule, {
    logger: ['error', 'warn'],
  });

  // Serve static files from the 'uploads' directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  console.log(`Current Working Directory: ${process.cwd()}`);

  setNestApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap().then(() => {
  console.log(
    `🟢 ${process.env.APP_NAME} is running on port ${process.env.PORT} (${process.env.NODE_ENV})`,
  );
});
