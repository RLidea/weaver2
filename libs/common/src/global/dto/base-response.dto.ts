// common/src/dto/base-response.dto.ts
export class BaseResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;

  constructor(data?: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}
