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

  const customerRepository = {
    findOne: jest.fn(),
  };

  const service = new NotificationRecipientResolverService(
    tenantLookup as unknown as TenantRecipientLookupService,
    customerRepository as any,
  );

  const envelope: EventEnvelope = {
    eventName: 'six1-event.process_step_ready',
    tenantId: 5,
    userId: 42,
    data: { assigneeId: 99 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tenantLookup.resolveTenantId.mockImplementation((id: unknown) =>
      id ? Number(id) : null,
    );
    tenantLookup.filterUserIdsToTenant.mockImplementation(
      async (_t: number, ids: number[]) => ids,
    );
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

  it('resolves tenant_role by multiple roleNames', async () => {
    tenantLookup.findUserIdsByRoleName
      .mockResolvedValueOnce([1, 2])
      .mockResolvedValueOnce([2, 3]);

    await expect(
      service.resolve(
        { type: 'tenant_role', roleNames: ['Manager', 'Admin'] },
        envelope,
      ),
    ).resolves.toEqual([1, 2, 3]);

    expect(tenantLookup.findUserIdsByRoleName).toHaveBeenCalledWith(5, 'Manager');
    expect(tenantLookup.findUserIdsByRoleName).toHaveBeenCalledWith(5, 'Admin');
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

  it('resolves workflow customer email from refs.customerCoreId', async () => {
    customerRepository.findOne.mockResolvedValue({
      customerId: 63,
      email: 'customer@example.com',
    });

    await expect(
      service.resolveDeliveryTargets(
        { type: 'workflow_customer_email' },
        {
          ...envelope,
          refs: { customerCoreId: 63 },
        },
      ),
    ).resolves.toEqual([
      { userId: 42, destinationEmail: 'customer@example.com' },
    ]);
  });

  it('resolves event_payload_field email to destinationEmail', async () => {
    await expect(
      service.resolveDeliveryTargets(
        { type: 'event_payload_field', path: 'data.emailAddress' },
        {
          ...envelope,
          data: { emailAddress: 'invitee@example.com' },
        },
      ),
    ).resolves.toEqual([
      { userId: 42, destinationEmail: 'invitee@example.com' },
    ]);
  });

  it('resolves entity.fields.email via customer context', async () => {
    customerRepository.findOne.mockResolvedValue({
      customerId: 63,
      email: 'customer@example.com',
    });

    await expect(
      service.resolveDeliveryTargets(
        { type: 'event_payload_field', path: 'entity.fields.email' },
        {
          ...envelope,
          data: {
            context: { customerId: 63 },
          },
        },
      ),
    ).resolves.toEqual([
      { userId: 42, destinationEmail: 'customer@example.com' },
    ]);
  });
});
