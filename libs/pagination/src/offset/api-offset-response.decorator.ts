import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
  NotFoundResponseDto,
  UnauthorizedResponseDto,
} from '@weaver2/common/global/dto/swagger/error-response.dto';
import { OffsetResponseDto } from './dto/offset-response.dto';

/**
 * Offset 페이지네이션 목록 응답의 Swagger 스펙을 정의하는 데코레이터입니다.
 * `OffsetResponseDto`는 제네릭이라 CLI 플러그인이 `data` 필드 타입을 해석하지 못해
 * 순환 참조로 오인하므로(`@ApiHideProperty` 처리됨), 여기서 실제 요소 타입을 채워 스펙을 완성한다.
 * 401/404 공통 에러 응답도 함께 포함하므로 `@ApiStandardResponses`와 병용할 필요는 없다.
 *
 * @example
 * @ApiOffsetResponse(AdminUserDto)
 * findAll(): Promise<OffsetResponseDto<AdminUserDto>> { ... }
 */
export function ApiOffsetResponse<TModel extends Type<unknown>>(
  model: TModel,
  options?: { status?: number; description?: string },
) {
  const { status = 200, description = 'Success' } = options || {};

  return applyDecorators(
    ApiExtraModels(OffsetResponseDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(OffsetResponseDto) },
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(model) } },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
      type: UnauthorizedResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found',
      type: NotFoundResponseDto,
    }),
  );
}
