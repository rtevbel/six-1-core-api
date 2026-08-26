import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Seeded Super Admin role — hidden from tenant-scoped role catalogs. */
export const SUPER_ADMIN_ROLE_ID = 1;

/** Global / platform-shared roles use `tenant_id = 0`. */
export const GLOBAL_ROLE_TENANT_ID = 0;

/**
 * How to scope the platform role (+ permission) catalogs for a caller.
 *
 * - `unscoped`: platform Super Admin with no tenant filter — full catalog.
 * - `tenant`: Object Explorer / active environment tenant — shared globals
 *   (except Super Admin) + that tenant's custom roles.
 * - `membership`: non–Super Admin with no explicit tenant filter — shared
 *   globals (except Super Admin) + roles for any tenant they belong to.
 */
export type PlatformRoleCatalogScope =
  | { mode: 'unscoped' }
  | { mode: 'tenant'; tenantId: number }
  | { mode: 'membership'; userId: number };

export function readPositiveFilterTenantId(
  filters: { tenantId?: number } | null | undefined,
): number | null {
  const t = filters?.tenantId;
  return typeof t === 'number' && Number.isFinite(t) && t > 0
    ? Math.trunc(t)
    : null;
}

export function resolvePlatformRoleCatalogScope(params: {
  filterTenantId: number | null;
  callerIsSuperAdmin: boolean;
  userId: number;
}): PlatformRoleCatalogScope {
  if (params.filterTenantId != null) {
    return { mode: 'tenant', tenantId: params.filterTenantId };
  }
  if (params.callerIsSuperAdmin) {
    return { mode: 'unscoped' };
  }
  return { mode: 'membership', userId: params.userId };
}

/** Restrict role list roots to tenant-visible rows. */
export function applyVisibleRolesScope<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  rootAlias: string,
  scope: Exclude<PlatformRoleCatalogScope, { mode: 'unscoped' }>,
): void {
  qb.andWhere(`${rootAlias}.roleId <> :_superAdminRoleId`, {
    _superAdminRoleId: SUPER_ADMIN_ROLE_ID,
  });

  if (scope.mode === 'tenant') {
    qb.andWhere(
      `(${rootAlias}.tenantId = :_globalRoleTenantId OR ${rootAlias}.tenantId = :_callerTenantId)`,
      {
        _globalRoleTenantId: GLOBAL_ROLE_TENANT_ID,
        _callerTenantId: scope.tenantId,
      },
    );
    return;
  }

  qb.andWhere(
    `(${rootAlias}.tenantId = :_globalRoleTenantId OR ${rootAlias}.tenantId IN (SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = :_scopeUserId))`,
    {
      _globalRoleTenantId: GLOBAL_ROLE_TENANT_ID,
      _scopeUserId: scope.userId,
    },
  );
}

/**
 * Restrict permission list roots to permissions granted on at least one
 * tenant-visible role (excludes Super-Admin-only grants such as settings.*).
 */
export function applyPermissionsVisibleViaRolesScope<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  permissionAlias: string,
  scope: Exclude<PlatformRoleCatalogScope, { mode: 'unscoped' }>,
): void {
  if (scope.mode === 'tenant') {
    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM role_permissions _rp_scope
        INNER JOIN roles _r_scope ON _r_scope.role_id = _rp_scope.role_id
        WHERE _rp_scope.permission_id = ${permissionAlias}.permission_id
          AND _r_scope.role_id <> :_superAdminRoleId
          AND (
            _r_scope.tenant_id = :_globalRoleTenantId
            OR _r_scope.tenant_id = :_callerTenantId
          )
      )`,
      {
        _superAdminRoleId: SUPER_ADMIN_ROLE_ID,
        _globalRoleTenantId: GLOBAL_ROLE_TENANT_ID,
        _callerTenantId: scope.tenantId,
      },
    );
    return;
  }

  qb.andWhere(
    `EXISTS (
      SELECT 1 FROM role_permissions _rp_scope
      INNER JOIN roles _r_scope ON _r_scope.role_id = _rp_scope.role_id
      WHERE _rp_scope.permission_id = ${permissionAlias}.permission_id
        AND _r_scope.role_id <> :_superAdminRoleId
        AND (
          _r_scope.tenant_id = :_globalRoleTenantId
          OR _r_scope.tenant_id IN (
            SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = :_scopeUserId
          )
        )
    )`,
    {
      _superAdminRoleId: SUPER_ADMIN_ROLE_ID,
      _globalRoleTenantId: GLOBAL_ROLE_TENANT_ID,
      _scopeUserId: scope.userId,
    },
  );
}

export function isRoleVisibleUnderScope(
  role: { roleId: number; tenantId: number },
  scope: PlatformRoleCatalogScope,
  membershipTenantIds?: ReadonlySet<number>,
): boolean {
  if (scope.mode === 'unscoped') {
    return true;
  }
  if (role.roleId === SUPER_ADMIN_ROLE_ID) {
    return false;
  }
  if (role.tenantId === GLOBAL_ROLE_TENANT_ID) {
    return true;
  }
  if (scope.mode === 'tenant') {
    return role.tenantId === scope.tenantId;
  }
  return membershipTenantIds?.has(role.tenantId) === true;
}
