import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationService } from './authorization.service';
import { AuthorizationGuard } from './authorization.guard';
import { UserRoleEntity } from '../users/user-roles/entities/user-role.entity';
import { TenantUserRoleEntity } from '../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { RolePermissionEntity } from '../roles/entities/role-permission.entity';
import { PermissionDescriptionEntity } from '../permissions/entities/permission_description.entity';

/**
 * AuthorizationModule is responsible for role-based access control (RBAC).
 * It provides authorization guards and services to check user permissions
 * based on roles and permissions assigned to users and tenant users.
 *
 * The module registers a global guard that checks for required permissions
 * using the @RequirePermissions() decorator on controllers and handlers.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the entities for TypeORM to enable database operations.
    TypeOrmModule.forFeature([
      UserRoleEntity,
      TenantUserRoleEntity,
      RolePermissionEntity,
      PermissionDescriptionEntity,
    ]),
  ],

  // Specifies the providers that contain the business logic.
  providers: [
    // Authorization service that handles permission checks.
    AuthorizationService,
    // Reflector is used to extract metadata from decorators.
    Reflector,
    // Registers AuthorizationGuard as a global guard for all routes.
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
  ],

  // Exports AuthorizationService for use in other modules.
  exports: [AuthorizationService],
})
export class AuthorizationModule {}

