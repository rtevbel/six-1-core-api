import {
  GLOBAL_SYSTEM_TENANT_ID,
  ensureSystemTenantRow,
  releaseConflictingSystemTenantIdentifier,
  repointSystemUserTenantToZero,
} from './system-tenant.bootstrap';

describe('system-tenant.bootstrap', () => {
  it('exports global system tenant id as 0', () => {
    expect(GLOBAL_SYSTEM_TENANT_ID).toBe(0);
  });

  it('skips insert when system tenant already exists', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ tenant_id: 0 }]);

    await ensureSystemTenantRow({ query });

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('renames conflicting system identifier before insert', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await releaseConflictingSystemTenantIdentifier({ query });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tenants'),
      ['system', GLOBAL_SYSTEM_TENANT_ID],
    );
  });

  it('repoints existing system-user tenant to tenant_id 0', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ sql_mode: 'ONLY_FULL_GROUP_BY' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await repointSystemUserTenantToZero({ query });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tenants t'),
      ['system', GLOBAL_SYSTEM_TENANT_ID, 'system', GLOBAL_SYSTEM_TENANT_ID],
    );
    expect(query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0');
    expect(query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1');
  });

  it('repoints system-user tenant when bootstrap finds owned row', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ tenant_id: 1 }])
      .mockResolvedValueOnce([{ sql_mode: 'ONLY_FULL_GROUP_BY' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await ensureSystemTenantRow({ query });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tenants t'),
      ['system', GLOBAL_SYSTEM_TENANT_ID, 'system', GLOBAL_SYSTEM_TENANT_ID],
    );
  });

  it('creates system user and tenant with NO_AUTO_VALUE_ON_ZERO when missing', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ sql_mode: 'ONLY_FULL_GROUP_BY' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await ensureSystemTenantRow({ query });

    expect(query).toHaveBeenNthCalledWith(
      5,
      `SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'`,
    );
    expect(query).toHaveBeenNthCalledWith(
      7,
      'SET SESSION sql_mode = ?',
      ['ONLY_FULL_GROUP_BY'],
    );
  });
});
