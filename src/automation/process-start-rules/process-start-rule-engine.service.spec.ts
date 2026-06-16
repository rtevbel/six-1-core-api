import { ProcessStartRuleEngineService } from './process-start-rule-engine.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../process-subject.constants';

describe('ProcessStartRuleEngineService', () => {
  const rulesService = {
    findActiveRulesForEvent: jest.fn(),
  };
  const lifecycle = {
    startProcess: jest.fn(),
  };
  const dedup = {
    findBlockingActiveProcess: jest.fn(),
  };
  const processFlags = {
    isEventStartRegistryEnabled: jest.fn().mockReturnValue(true),
  };
  const catalog = {
    resolveCanonicalEventName: jest.fn((name: string) => name),
  };

  const engine = new ProcessStartRuleEngineService(
    rulesService as never,
    lifecycle as never,
    dedup as never,
    processFlags as never,
    catalog as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    dedup.findBlockingActiveProcess.mockResolvedValue(null);
    lifecycle.startProcess.mockResolvedValue({
      processInstanceId: 900,
      firstStepInstanceId: 901,
      correlationId: 'corr-tenant-42',
    });
  });

  it('starts a workflow process when tenant.created rule matches', async () => {
    rulesService.findActiveRulesForEvent.mockResolvedValue([
      {
        ruleId: 7,
        templateId: 12,
        subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
        subjectIdSource: 'workflow_self',
        contextPatch: { tenantId: { path: 'entity.entityId' } },
        filterJson: null,
      },
    ]);

    const results = await engine.process(
      {
        eventName: PLATFORM_EVENT_NAMES.TENANT_CREATED,
        tenantId: 42,
        entity: { entityType: 'tenant', entityId: 42 },
        createdBy: 3,
        correlationId: 'corr-tenant-42',
      },
      { recordId: 55 } as never,
    );

    expect(results).toEqual([
      {
        ruleId: 7,
        status: 'started',
        processInstanceId: 900,
      },
    ]);
    expect(lifecycle.startProcess).toHaveBeenCalledWith({
      tenantId: 42,
      createdBy: 3,
      templateId: 12,
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      subjectId: 0,
      context: { tenantId: 42 },
      correlationId: 'corr-tenant-42',
    });
  });

  it('skips when an active process already exists for the subject', async () => {
    rulesService.findActiveRulesForEvent.mockResolvedValue([
      {
        ruleId: 8,
        templateId: 12,
        subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
        subjectIdSource: 'workflow_self',
        contextPatch: null,
        filterJson: null,
      },
    ]);
    dedup.findBlockingActiveProcess.mockResolvedValue({
      processInstanceId: 777,
    });

    const results = await engine.process(
      {
        eventName: PLATFORM_EVENT_NAMES.TENANT_CREATED,
        tenantId: 42,
        entity: { entityType: 'tenant', entityId: 42 },
      },
      { recordId: 56 } as never,
    );

    expect(results[0]).toMatchObject({
      ruleId: 8,
      status: 'skipped',
      processInstanceId: 777,
      reason: 'active_process_exists',
    });
    expect(lifecycle.startProcess).not.toHaveBeenCalled();
  });

  it('no-ops when feature flag is disabled', async () => {
    processFlags.isEventStartRegistryEnabled.mockReturnValue(false);

    await engine.process(
      { eventName: PLATFORM_EVENT_NAMES.TENANT_CREATED, tenantId: 42 },
      { recordId: 57 } as never,
    );

    expect(rulesService.findActiveRulesForEvent).not.toHaveBeenCalled();
  });
});
