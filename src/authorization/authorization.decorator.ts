import { SetMetadata } from '@nestjs/common';
import { REQUIRED_PERMISSIONS_KEY } from './constants';

/**
 * RequirePermissions decorator for specifying required permissions on routes.
 *
 * Use this decorator on controller methods or classes to require specific
 * permissions for access. The AuthorizationGuard will check if the user has
 * all specified permissions before allowing access.
 *
 * @param permissions - Array of permission names (e.g., 'projects.create', 'tasks.read')
 * @returns A decorator that sets metadata for the AuthorizationGuard
 *
 * @example
 * ```typescript
 * @RequirePermissions('projects.create')
 * @Post('projects')
 * async createProject(@Body() dto: CreateProjectDto) {
 *   // ...
 * }
 * ```
 *
 * @example
 * ```typescript
 * @RequirePermissions('projects.read', 'tasks.read')
 * @Get('dashboard')
 * async getDashboard() {
 *   // Requires both permissions
 * }
 * ```
 *
 * @version 0.0.1
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

