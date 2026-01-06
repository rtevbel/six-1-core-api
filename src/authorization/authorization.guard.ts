import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from './authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from './constants';

interface CallerContext {
  userId: number;
  tenantUserId?: number;
}

/**
 * AuthorizationGuard implements role-based access control (RBAC).
 *
 * This guard checks if the authenticated user has the required permissions
 * specified via the @RequirePermissions() decorator. It extracts user context
 * from both HTTP requests and RPC calls, then delegates permission checking
 * to the AuthorizationService.
 *
 * If no permissions are required (no decorator), access is granted.
 * If permissions are required but the user lacks them, a ForbiddenException is thrown.
 *
 * @version 0.0.1
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission metadata -> allow access.
    if (!permissions || permissions.length === 0) {
      return true;
    }

    const { userId, tenantUserId } = this.getCaller(context);
    const hasPermissions = await this.authorizationService.hasPermissions(
      userId,
      permissions,
      tenantUserId,
    );

    if (!hasPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Extracts user context from the execution context.
   *
   * This method supports both HTTP requests and RPC calls. For HTTP requests,
   * it extracts userId and tenantUserId from request.user or request.body.
   * For RPC calls, it extracts them from the data payload.
   *
   * @param context - The execution context containing request information.
   * @returns An object containing userId and optional tenantUserId.
   * @throws UnauthorizedException if the execution context type is unsupported.
   */
  private getCaller(context: ExecutionContext): CallerContext {
    const type = context.getType<'http' | 'rpc' | string>();

    if (type === 'http') {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.userId ?? request.body?.userId;
      const tenantUserId =
        request.user?.tenantUserId ?? request.body?.tenantUserId;
      return this.ensureUser(userId, tenantUserId);
    }

    if (type === 'rpc') {
      const data = context.switchToRpc().getData() ?? {};
      const userId = data.userId ?? data.user_id;
      const tenantUserId = data.tenantUserId ?? data.tenant_user_id;
      return this.ensureUser(userId, tenantUserId);
    }

    throw new UnauthorizedException('Unsupported execution context');
  }

  /**
   * Validates and normalizes user context.
   *
   * Ensures that userId is present and converts string IDs to numbers.
   * Throws UnauthorizedException if userId is missing.
   *
   * @param userId - User ID (can be number or string).
   * @param tenantUserId - Optional tenant user ID (can be number or string).
   * @returns Normalized CallerContext with numeric IDs.
   * @throws UnauthorizedException if userId is missing.
   */
  private ensureUser(
    userId?: number | string,
    tenantUserId?: number | string,
  ): CallerContext {
    if (!userId) {
      throw new UnauthorizedException('User context is missing');
    }

    return {
      userId: Number(userId),
      tenantUserId: tenantUserId ? Number(tenantUserId) : undefined,
    };
  }
}
