import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoreService {
  constructor(private readonly configService: ConfigService) {}
  index(): string {
    return `${this.configService.get('APP_NAME')}(${this.configService.get(
      'NODE_ENV',
    )}) is running`;
  }
}
