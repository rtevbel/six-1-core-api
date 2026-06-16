import { Test, TestingModule } from '@nestjs/testing';
import { ProcessStartRuleEngineService } from './process-start-rule-engine.service';
import { ProcessStartRulesService } from '../../process_start_rules/process_start_rules.service';
import { ProcessLifecycleFacade } from '../process-lifecycle.facade';
import { ProcessStartRuleDedupService } from './process-start-rule-dedup.service';
import { ProcessFeatureFlagsService } from '../config/process-feature-flags.service';
import { EventCatalogService } from '../../events/event-catalog.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../process-subject.constants';

/**
 * D8 — Integration coverage: tenant.created → workflow process instance.
 */
describe('Process start rules (integration — D8)', () => {
  let engine: ProcessStartRuleEngineService;
  let rulesService: { findActiveRulesForEvent: jest.Mock };
  let lifecycle: { startProcess: jest.Mock };
  let dedup: { findBlockingActiveProcess: jest.Mock };

  beforeEach(async () => {
    rulesService = { findActiveRulesForEvent: jest.fn() };
    lifecycle = {
      startProcess: jest.fn().mockResolvedValue({
        processInstanceId: 1001,
        firstStepInstanceId: 2001,
        correlationId: 'corr-tenant-42',
      }),
    };
    dedup = { findBlockingActiveProcess: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStartRuleEngineService,
        { provide: ProcessStartRulesService, useValue: rulesService },
        { provide: ProcessLifecycleFacade, useValue: lifecycle },
        { provide: ProcessStartRuleDedupService, useValue: dedup },
        {
          provide: ProcessFeatureFlagsService,
          useValue: { isEventStartRegistryEnabled: jest.fn().mockReturnValue(true) },
        },
        {
          provide: EventCatalogService,
          useValue: { resolveCanonicalEventName: jest.fn((n: string) => n) },
        },
      ],
    }).compile();

    engine = module.get(ProcessStartRuleEngineService);
  });

  it('tenant.created rule starts onboarding workflow with tenant context', async () => {
    rulesService.findActiveRulesForEvent.mockResolvedValue([
      {
        ruleId: 1,
        templateId: 9,
        subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
        subjectIdSource: 'workflow_self',
        contextPatch: {
          tenantId: { path: 'entity.entityId' },
          sourceEvent: PLATFORM_EVENT_NAMES.TENANT_CREATED,
        },
        filterJson: null,
        isActive: true,
      },
    ]);

    const envelope = {
      eventName: PLATFORM_EVENT_NAMES.TENANT_CREATED,
      tenantId: 42,
      entity: { entityType: 'tenant', entityId: 42 },
      createdBy: 5,
      correlationId: 'corr-tenant-42',
    };

    const results = await engine.process(envelope, { recordId: 88 } as never);

    expect(rulesService.findActiveRulesForEvent).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.TENANT_CREATED,
      42,
    );
    expect(dedup.findBlockingActiveProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 42,
        templateId: 9,
        subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
        subjectId: 0,
        correlationId: 'corr-tenant-42',
      }),
    );
    expect(lifecycle.startProcess).toHaveBeenCalledWith({
      tenantId: 42,
      createdBy: 5,
      templateId: 9,
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      subjectId: 0,
      context: {
        tenantId: 42,
        sourceEvent: PLATFORM_EVENT_NAMES.TENANT_CREATED,
      },
      correlationId: 'corr-tenant-42',
    });
    expect(results[0].status).toBe('started');
    expect(results[0].processInstanceId).toBe(1001);
  });
});
