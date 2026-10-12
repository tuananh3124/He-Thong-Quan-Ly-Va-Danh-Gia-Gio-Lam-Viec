import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_TYPE, ROLE } from '@projectname/shared';
import { IPayloadType } from '@/common/decorators/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ROLE_TYPE[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]) || [ROLE.Staff];

    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: IPayloadType }>();
    const user = request.user;

    return user ? requiredRoles.includes(user.role) : false;
  }
}
