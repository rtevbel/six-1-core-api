import { ProcessStepAssigneeResolverService } from './process-step-assignee-resolver.service';
import { NotificationRecipientResolverService } from '../events/notification-rules/notification-recipient-resolver.service';
import { TenantRecipientLookupService } from '../events/notification-rules/tenant-recipient-lookup.service';
import type { ProcessStepAssigneeResolveContext } from './process-step-assignee-spec.types';

describe('ProcessStepAssigneeResolverService', () => {
  const recipientResolver = {
    resolve: jest.fn(),
  };
  const tenantLookup = {
    findUserIdByTenantUserId: jest.fn(),
    findTenantUserIdsByUserIds: jest.fn(),
  };

  const service = new ProcessStepAssigneeResolverService(
    recipientResolver as unknown as NotificationRecipientResolverService,
    tenantLookup as unknown as TenantRecipientLookupService,
  );

  const baseCtx: ProcessStepAssigneeResolveContext = {
    tenantId: 10,
    processInstanceId: 100,
    stepInstanceId: 200,
    actorTenantUserId: 55,
    subjectType: 'workflow',
    subjectId: 100,
    subjectMetadata: null,
    context: { managerId: 77 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tenantLookup.findUserIdByTenantUserId.mockResolvedValue(42);
    recipientResolver.resolve.mockResolvedValue([42, 77]);
    tenantLookup.findTenantUserIdsByUserIds.mockResolvedValue([501, 502]);
  });

  it('resolves tenant_role spec via notification recipient resolver', async () => {
    const result = await service.resolveTenantUserIds(
      { type: 'tenant_role', roleName: 'Manager' },
      baseCtx,
    );

    expect(tenantLookup.findUserIdByTenantUserId).toHaveBeenCalledWith(10, 55);
    expect(recipientResolver.resolve).toHaveBeenCalledWith(
      { type: 'tenant_role', roleName: 'Manager' },
      expect.objectContaining({
        tenantId: 10,
        userId: 42,
        data: expect.objectContaining({
          managerId: 77,
          subjectType: 'workflow',
        }),
      }),
    );
    expect(tenantLookup.findTenantUserIdsByUserIds).toHaveBeenCalledWith(
      10,
      [42, 77],
    );
    expect(result).toEqual([501, 502]);
  });

  it('resolves explicit_user_ids to tenant user ids', async () => {
    recipientResolver.resolve.mockResolvedValue([3, 4]);
    tenantLookup.findTenantUserIdsByUserIds.mockResolvedValue([301]);

    const result = await service.resolveTenantUserIds(
      { type: 'explicit_user_ids', userIds: [3, 4] },
      baseCtx,
    );

    expect(result).toEqual([301]);
  });

  it('returns empty when resolver yields no platform users', async () => {
    recipientResolver.resolve.mockResolvedValue([]);

    const result = await service.resolveTenantUserIds(
      { type: 'event_payload_field', path: 'data.missing' },
      baseCtx,
    );

    expect(result).toEqual([]);
    expect(tenantLookup.findTenantUserIdsByUserIds).not.toHaveBeenCalled();
  });
});
