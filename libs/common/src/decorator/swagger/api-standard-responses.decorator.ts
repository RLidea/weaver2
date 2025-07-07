import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import {
  NotFoundResponseDto,
  UnauthorizedResponseDto,
} from '../../global/dto/swagger/error-response.dto';

/**
 * API의 표준 응답을 정의하는 커스텀 데코레이터입니다.
 * 성공 응답(기본 200)과 공통적인 에러 응답(401, 404)을 한번에 적용합니다.
 *
 * @param options - 옵션 객체
 * @param options.type - 성공 응답의 DTO 클래스. 이 값이 없으면 성공 응답은 ApiResponse에 추가되지 않습니다.
 * @param options.status - 성공 응답의 HTTP 상태 코드 (기본값: 200)
 * @param options.description - 성공 응답의 설명 (기본값: 'Success')
 *
 * @example
 * // 1. 기본 사용법 (성공 DTO만 지정)
 * // GET /users/me
 * @ApiStandardResponses({ type: UserDto })
 * // 결과: @ApiResponse({ status: 200, type: UserDto }), @ApiResponse({ status: 401 }), @ApiResponse({ status: 404 })
 *
 * // 2. 상태 코드와 설명을 함께 지정
 * // POST /users
 * @ApiStandardResponses({ type: UserDto, status: 201, description: '사용자 생성 성공' })
 * // 결과: @ApiResponse({ status: 201, type: UserDto, ... }), @ApiResponse({ status: 401 }), @ApiResponse({ status: 404 })
 *
 * // 3. 성공 응답 본문이 없는 경우 (e.g., 204 No Content)
 * // DELETE /users/me
 * @ApiStandardResponses({ status: 204, description: '계정 탈퇴 성공' })
 * // 결과: @ApiResponse({ status: 204, ... }), @ApiResponse({ status: 401 }), @ApiResponse({ status: 404 })
 */
export function ApiStandardResponses(options?: {
  type?: Type<any>;
  status?: number;
  description?: string;
}) {
  const { type, status = 200, description = 'Success' } = options || {};

  const decorators = [
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
  ];

  // `type`이 제공된 경우에만 성공 응답을 추가합니다.
  // `type`이 없으면, 성공 응답 본문이 없다고 간주합니다. (예: 204 No Content)
  if (type) {
    decorators.push(ApiResponse({ status, description, type }));
  } else {
    // type이 없는 경우, status와 description만으로 응답을 정의합니다.
    decorators.push(ApiResponse({ status, description }));
  }

  return applyDecorators(...decorators);
}
