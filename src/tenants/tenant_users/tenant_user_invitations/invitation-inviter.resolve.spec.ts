import { resolveInviterTenantUserId } from './invitation-inviter.resolve';

describe('resolveInviterTenantUserId', () => {
  const memberships = [
    { tenantUserId: 5, tenantId: 20, userId: 99 },
  ];

  const findByTenantUserId = async (tenantUserId: number, tenantId: number) =>
    memberships.find(
      (row) => row.tenantUserId === tenantUserId && row.tenantId === tenantId,
    ) ?? null;

  const findByUserId = async (userId: number, tenantId: number) =>
    memberships.find(
      (row) => row.userId === userId && row.tenantId === tenantId,
    ) ?? null;

  it('keeps a suggested value when it is a tenant_user in the tenant', async () => {
    await expect(
      resolveInviterTenantUserId({
        tenantId: 20,
        actorUserId: 99,
        suggestedInvitedBy: 5,
        findByTenantUserId,
        findByUserId,
      }),
    ).resolves.toBe(5);
  });

  it('falls back to the actor membership when suggested is a user id', async () => {
    await expect(
      resolveInviterTenantUserId({
        tenantId: 20,
        actorUserId: 99,
        suggestedInvitedBy: 99,
        findByTenantUserId,
        findByUserId,
      }),
    ).resolves.toBe(5);
  });

  it('throws when the actor has no membership', async () => {
    await expect(
      resolveInviterTenantUserId({
        tenantId: 20,
        actorUserId: 1,
        findByTenantUserId,
        findByUserId,
      }),
    ).rejects.toThrow('Inviter is not a member of this tenant.');
  });
});
