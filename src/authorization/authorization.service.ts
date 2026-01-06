import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { UserRoleEntity } from '../users/user-roles/entities/user-role.entity';
import { TenantUserRoleEntity } from '../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { RolePermissionEntity } from '../roles/entities/role-permission.entity';
import { PermissionDescriptionEntity } from '../permissions/entities/permission_description.entity';

type PermissionName = string;

/**
 * AuthorizationService handles permission checks for users and tenant users.
 *
 * This service queries the database to determine if a user has the required
 * permissions based on their assigned roles. It supports both global user
 * roles and tenant-specific user roles.
 *
 * Permission checking follows a hierarchical model where `module.manage`
 * permission grants access to all actions within that module (e.g., `projects.manage`
 * grants access to `projects.create`, `projects.read`, `projects.update`, etc.).
 *
 * @version 0.0.1
 */
@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(TenantUserRoleEntity)
    private readonly tenantUserRoleRepository: Repository<TenantUserRoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
    @InjectRepository(PermissionDescriptionEntity)
    private readonly permissionDescriptionRepository: Repository<PermissionDescriptionEntity>,
  ) {}

  /**
   * Checks if a user has all the required permissions.
   *
   * This method retrieves all permissions granted to the user through their roles
   * (both global user roles and tenant-specific roles if tenantUserId is provided)
   * and verifies that every required permission is satisfied.
   *
   * @param userId - ID of the user to check permissions for.
   * @param permissions - Array of permission names required (e.g., ['projects.create', 'tasks.read']).
   * @param tenantUserId - Optional tenant user ID for tenant-scoped permission checks.
   * @returns True if the user has all required permissions, false otherwise.
   */
  async hasPermissions(
    userId: number,
    permissions: PermissionName[],
    tenantUserId?: number,
  ): Promise<boolean> {
    const permissionSet = await this.getPermissionSet(userId, tenantUserId);
    return permissions.every((permission) =>
      this.permissionSatisfied(permission, permissionSet),
    );
  }

  /**
   * Retrieves all permission names granted to a user.
   *
   * This method queries the database to get all permissions associated with
   * the user's roles. It checks both global user roles and tenant user roles
   * if a tenantUserId is provided.
   *
   * @param userId - ID of the user to get permissions for.
   * @param tenantUserId - Optional tenant user ID for tenant-scoped permissions.
   * @returns A Set of permission names granted to the user.
   */
  private async getPermissionSet(
    userId: number,
    tenantUserId?: number,
  ): Promise<Set<PermissionName>> {
    const qb = this.basePermissionQuery();

    qb.andWhere(
      new Brackets((where) => {
        where.where('ur.user_id = :userId', { userId });

        if (tenantUserId) {
          where.orWhere('tur.tenant_user_id = :tenantUserId', { tenantUserId });
        }
      }),
    );

    const rows = await qb.getRawMany<{ name: string }>();
    return new Set(rows.map((row) => row.name));
  }

  /**
   * Builds a base query for retrieving user permissions.
   *
   * This method constructs a TypeORM query builder that joins permission descriptions
   * with role permissions, user roles, and tenant user roles to retrieve all
   * permissions associated with roles assigned to users.
   *
   * @returns A SelectQueryBuilder configured to retrieve permission names.
   */
  private basePermissionQuery(): SelectQueryBuilder<PermissionDescriptionEntity> {
    return this.permissionDescriptionRepository
      .createQueryBuilder('pd')
      .select('pd.name', 'name')
      .distinct(true)
      .innerJoin(
        this.rolePermissionRepository.metadata.tableName,
        'rp',
        'rp.permission_id = pd.permission_id',
      )
      .innerJoin(
        this.userRoleRepository.metadata.tableName,
        'ur',
        'ur.role_id = rp.role_id',
      )
      .leftJoin(
        this.tenantUserRoleRepository.metadata.tableName,
        'tur',
        'tur.role_id = rp.role_id',
      );
  }

  /**
   * Checks if a required permission is satisfied by the granted permission set.
   *
   * This method implements hierarchical permission checking where a `module.manage`
   * permission grants access to all actions within that module. For example,
   * if a user has `projects.manage`, they automatically have access to
   * `projects.create`, `projects.read`, `projects.update`, and `projects.delete`.
   *
   * @param requiredPermission - The permission name required (e.g., 'projects.create').
   * @param granted - Set of permission names granted to the user.
   * @returns True if the required permission is satisfied, false otherwise.
   */
  private permissionSatisfied(
    requiredPermission: PermissionName,
    granted: Set<PermissionName>,
  ): boolean {
    if (granted.has(requiredPermission)) {
      return true;
    }

    const [module] = requiredPermission.split('.');
    const managePermission = `${module}.manage`;

    return granted.has(managePermission);
  }
}

