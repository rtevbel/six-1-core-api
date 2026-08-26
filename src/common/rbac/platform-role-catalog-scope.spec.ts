import {
  applyVisibleRolesScope,
  isRoleVisibleUnderScope,
  readPositiveFilterTenantId,
  resolvePlatformRoleCatalogScope,
  SUPER_ADMIN_ROLE_ID,
  type PlatformRoleCatalogScope,
} from './platform-role-catalog-scope';

describe('platform-role-catalog-scope', () => {
  it('scopes to tenant when filter tenantId is set', () => {
    expect(
      resolvePlatformRoleCatalogScope({
        filterTenantId: 20,
        callerIsSuperAdmin: true,
        userId: 1,
      }),
    ).toEqual({ mode: 'tenant', tenantId: 20 });
  });

  it('leaves Super Admin unscoped when no tenant filter', () => {
    expect(
      resolvePlatformRoleCatalogScope({
        filterTenantId: null,
        callerIsSuperAdmin: true,
        userId: 1,
      }),
    ).toEqual({ mode: 'unscoped' });
  });

  it('falls back to membership scope for non–Super Admin', () => {
    expect(
      resolvePlatformRoleCatalogScope({
        filterTenantId: null,
        callerIsSuperAdmin: false,
        userId: 20,
      }),
    ).toEqual({ mode: 'membership', userId: 20 });
  });

  it('hides Super Admin and foreign tenant roles under tenant scope', () => {
    const scope: PlatformRoleCatalogScope = { mode: 'tenant', tenantId: 20 };
    expect(
      isRoleVisibleUnderScope({ roleId: SUPER_ADMIN_ROLE_ID, tenantId: 0 }, scope),
    ).toBe(false);
    expect(isRoleVisibleUnderScope({ roleId: 2, tenantId: 0 }, scope)).toBe(true);
    expect(isRoleVisibleUnderScope({ roleId: 10, tenantId: 20 }, scope)).toBe(
      true,
    );
    expect(isRoleVisibleUnderScope({ roleId: 11, tenantId: 99 }, scope)).toBe(
      false,
    );
  });

  it('applies role visibility predicates on a query builder', () => {
    const clauses: string[] = [];
    const params: Record<string, unknown>[] = [];
    const qb = {
      andWhere: (sql: string, p?: Record<string, unknown>) => {
        clauses.push(sql);
        if (p) params.push(p);
        return qb;
      },
    };

    applyVisibleRolesScope(qb as never, 'r', { mode: 'tenant', tenantId: 20 });

    expect(clauses[0]).toContain('r.roleId <>');
    expect(clauses[1]).toContain('r.tenantId');
    expect(params[0]).toMatchObject({ _superAdminRoleId: SUPER_ADMIN_ROLE_ID });
    expect(params[1]).toMatchObject({
      _globalRoleTenantId: 0,
      _callerTenantId: 20,
    });
  });

  it('reads positive filter tenant ids only', () => {
    expect(readPositiveFilterTenantId({ tenantId: 20 })).toBe(20);
    expect(readPositiveFilterTenantId({ tenantId: 0 })).toBeNull();
    expect(readPositiveFilterTenantId({})).toBeNull();
  });
});
