import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUser(email: string, password: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { email },
      include: { user: true },
    });

    if (!auth || !auth.password)
      throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, auth.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return auth.user;
  }
}
