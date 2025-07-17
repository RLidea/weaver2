import { SetMetadata } from '@nestjs/common';
import { Role as CoreRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: CoreRole[]) => SetMetadata(ROLES_KEY, roles);
