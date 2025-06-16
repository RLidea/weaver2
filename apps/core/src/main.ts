import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { setNestApp } from '@weaver2/common/configs/set-nest-app.config';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule);

  setNestApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap().then(() => {
  console.log(
    `🟢 ${process.env.APP_NAME} is running on port ${process.env.PORT} (${process.env.NODE_ENV})`,
  );
});
