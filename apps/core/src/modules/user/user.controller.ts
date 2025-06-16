import { Controller, Get, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { FindUsersDto } from './queries/dto/find-users.dto';

@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Get()
  findAll(@Query() findUsersDto: FindUsersDto) {
    return this.usersService.findUsers(findUsersDto);
  }
}
