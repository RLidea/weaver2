import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOperationOptions } from '@nestjs/swagger';
import { Public } from '../public.decorator';

export const ApiOperationWithPublic = (options: ApiOperationOptions) =>
  applyDecorators(ApiOperation(options), Public());
