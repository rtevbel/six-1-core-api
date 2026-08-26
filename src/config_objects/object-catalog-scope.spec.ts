import {
  inferDefaultBindingModeForObjectType,
  isJunctionOnlyObjectType,
  isSystemTableObjectType,
} from './object-catalog-scope';

describe('object catalog scope policy', () => {
  it('marks stable platform tables as system_table', () => {
    expect(isSystemTableObjectType('users')).toBe(true);
    expect(isSystemTableObjectType('role_descriptions')).toBe(true);
    expect(isSystemTableObjectType('process_instance_steps')).toBe(true);
    expect(isSystemTableObjectType('tenant')).toBe(true);
    expect(isSystemTableObjectType('tenants')).toBe(true);
    expect(isSystemTableObjectType('tenant_team')).toBe(true);
    expect(isSystemTableObjectType('tenant_teams')).toBe(true);
  });

  it('marks pure membership tables as junction-only', () => {
    expect(isJunctionOnlyObjectType('role_permissions')).toBe(true);
    expect(isJunctionOnlyObjectType('user_roles')).toBe(true);
    expect(isJunctionOnlyObjectType('tenant_user_roles')).toBe(true);
  });

  it('infers default binding mode from the agreed scope policy', () => {
    expect(inferDefaultBindingModeForObjectType('tenant_user_meta')).toBe(
      'system_table',
    );
    expect(inferDefaultBindingModeForObjectType('tenant')).toBe('system_table');
    expect(inferDefaultBindingModeForObjectType('projects')).toBe('sor_bound');
    expect(inferDefaultBindingModeForObjectType('role_permissions')).toBeNull();
  });
});
