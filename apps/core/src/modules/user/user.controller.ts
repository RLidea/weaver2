import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';

@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Get()
  findAll() {
    return this.usersService.findUsers();
  }
}
