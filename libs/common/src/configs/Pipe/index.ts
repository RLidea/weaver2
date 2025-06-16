import { INestApplication, ValidationPipe } from '@nestjs/common';

export function setPipe<T extends INestApplication>(app: T): void {
  // class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // <- class-transformer 활성화
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
}
