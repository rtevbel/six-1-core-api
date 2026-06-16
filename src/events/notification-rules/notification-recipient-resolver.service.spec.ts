import { NotificationRecipientResolverService } from './notification-recipient-resolver.service';
import { TenantRecipientLookupService } from './tenant-recipient-lookup.service';
import type { EventEnvelope } from '../types';

describe('NotificationRecipientResolverService', () => {
  const tenantLookup = {
    resolveTenantId: jest.fn((id: unknown) => (id ? Number(id) : null)),
    filterUserIdsToTenant: jest.fn(async (_t: number, ids: number[]) => ids),
    findUserIdsByRoleName: jest.fn(),
    findUserIdsByPermission: jest.fn(),
    findTenantAdminUserIds: jest.fn(),
  };

  const service = new NotificationRecipientResolverService(
    tenantLookup as unknown as TenantRecipientLookupService,
  );

  const envelope: EventEnvelope = {
    eventName: 'six1-event.process_step_ready',
    tenantId: 5,
    userId: 42,
    data: { assigneeId: 99 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves event_actor', async () => {
    await expect(
      service.resolve({ type: 'event_actor' }, envelope),
    ).resolves.toEqual([42]);
  });

  it('resolves assignee from known payload paths', async () => {
    await expect(
      service.resolve({ type: 'assignee' }, envelope),
    ).resolves.toEqual([99]);
  });

  it('resolves tenant_role by permission', async () => {
    tenantLookup.findUserIdsByPermission.mockResolvedValue([7, 8]);

    await expect(
      service.resolve(
        { type: 'tenant_role', permission: 'finance.approve' },
        envelope,
      ),
    ).resolves.toEqual([7, 8]);

    expect(tenantLookup.findUserIdsByPermission).toHaveBeenCalledWith(
      5,
      'finance.approve',
    );
  });

  it('resolves tenant_admins', async () => {
    tenantLookup.findTenantAdminUserIds.mockResolvedValue([3]);

    await expect(
      service.resolve({ type: 'tenant_admins' }, envelope),
    ).resolves.toEqual([3]);
  });

  it('filters explicit_user_ids to tenant members', async () => {
    tenantLookup.filterUserIdsToTenant.mockResolvedValue([2]);

    await expect(
      service.resolve({ type: 'explicit_user_ids', userIds: [1, 2, 3] }, envelope),
    ).resolves.toEqual([2]);
  });
});
