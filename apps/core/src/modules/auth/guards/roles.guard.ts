/* eslint-disable */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../../../decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug(`Required roles: ${JSON.stringify(requiredRoles)}`);

    if (!requiredRoles) {
      return true; // No roles required, access granted
    }

    const { user } = context.switchToHttp().getRequest();

    this.logger.debug(`User object in RolesGuard: ${JSON.stringify(user)}`);
    this.logger.debug(`User role: ${user?.role}`);

    // If there's no user object, access is denied (should be handled by JwtAuthGuard before this)
    if (!user || !user.role) {
      this.logger.warn('User or user role is missing. Access denied.');
      return false;
    }

    // Ensure user.role is of type Role
    const userRole = user.role as Role;

    const hasRequiredRole = requiredRoles.some((role) => userRole === role);
    this.logger.debug(`Has required role: ${hasRequiredRole}`);

    return hasRequiredRole;
  }
}
