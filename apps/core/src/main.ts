import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap().then(() => {
  console.log(
    `🟢 ${process.env.APP_NAME} is running on port ${process.env.PORT} (${process.env.NODE_ENV})`,
  );
});
