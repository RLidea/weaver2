import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  @Get()
  findAll(): string {
    return 'This action returns all users';
  }
}
