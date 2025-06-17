import {
  INestApplication,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function setPipe<T extends INestApplication>(app: T): void {
  // class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const nestValidationPipeResult =
          new ValidationPipe().createExceptionFactory()(validationErrors) as {
            response: { message: string[] };
          };

        return new UnprocessableEntityException(
          {
            code: 'VALIDATION_ERROR',
            message: nestValidationPipeResult?.response?.message,
          },
          'Validation Error',
        );
      },
    }),
  );
}
