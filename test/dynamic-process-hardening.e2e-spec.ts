import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigObjectsService } from '../src/config_objects/config_objects.service';
import { ConfigObjectCompletenessService } from '../src/config_objects/config-object-completeness.service';
import { ConfigCustomObjectInstanceEntity } from '../src/config_objects/entities/config_custom_object_instance.entity';
import { ActionExecutorService } from '../src/events/platform-actions/action-executor.service';
import { EventsService } from '../src/events/events.service';
import { EventCatalogService } from '../src/events/event-catalog.service';
import { PLATFORM_EVENT_NAMES } from '../src/events/constants/platform-event-names.constants';
import { ProcessInstanceEntity } from '../src/process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../src/process_instances/process_instance_steps/entities/process_instance_step.entity';
import { ProcessInstanceStepActionEntity } from '../src/process_instances/process_instance_steps/process_instance_step_actions/entities/process_instance_step_action.entity';
import { ProcessStartRulesService } from '../src/process_start_rules/process_start_rules.service';
import { ChildProcessOrchestrationService } from '../src/automation/child-process-orchestration.service';
import { ConfigObjectStepExecutor } from '../src/automation/config-object-step-executor.service';
import { ProcessFeatureFlagsService } from '../src/automation/config/process-feature-flags.service';
import { ProcessCompletionService } from '../src/automation/process-completion.service';
import { ProcessHostRegistry } from '../src/automation/process-host/process-host.registry';
import { ProjectHostAdapter } from '../src/automation/process-host/project-host.adapter';
import { ScheduledTaskHostAdapter } from '../src/automation/process-host/scheduled-task-host.adapter';
import { ConfigurableInstanceHostAdapter } from '../src/automation/process-host/configurable-instance-host.adapter';
import { GenericWorkflowHostAdapter } from '../src/automation/process-host/generic-workflow-host.adapter';
import { SorEntityHostAdapter } from '../src/automation/process-host/sor-entity-host.adapter';
import { ProcessInstantiationService } from '../src/automation/process-instantiation.service';
import { ProcessLifecycleFacade } from '../src/automation/process-lifecycle.facade';
import { ProcessStartRuleDedupService } from '../src/automation/process-start-rules/process-start-rule-dedup.service';
import { ProcessStartRuleEngineService } from '../src/automation/process-start-rules/process-start-rule-engine.service';
import {
  PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
} from '../src/automation/process-step-action.constants';
import { ProcessStepActionExecutionLogService } from '../src/automation/process-step-action-execution-log.service';
import { ProcessStepActionExecutorService } from '../src/automation/process-step-action-executor.service';
import { ProcessStepActionOrchestrationService } from '../src/automation/process-step-action-orchestration.service';
import { ProcessStepWebhookClient } from '../src/automation/process-step-webhook.client';
import {
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
} from '../src/automation/process-step-object-binding.constants';
import {
  CHILD_SUBJECT_POLICY_WORKFLOW,
  PROCESS_STEP_TASK_TYPE_CALL_PROCESS,
} from '../src/automation/process-step-task-type.constants';
import {
  PROCESS_SUBJECT_TYPE_SOR_ENTITY,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from '../src/automation/process-subject.constants';
import { createSqlRouter, normalizeSql } from './fixtures/dynamic-process-sql-router';

const tenantId = 5;
const customerId = 42;

/**
 * J1–J3 — End-to-end workflow hardening (message-handler level, scripted SQL).
 * Chains real Nest services; DB and external I/O are simulated.
 */
describe('Dynamic process hardening (e2e — J1–J3)', () => {
  describe('J1 — customer profile (Tier 4 + SOR binding + C4 write-back)', () => {
    const profileStepId = 301;
    const profileProcessId = 900;

    let facade: ProcessLifecycleFacade;
    let executor: ConfigObjectStepExecutor;
    let orchestration: ProcessStepActionOrchestrationService;
    let configObjectsService: {
      resolveObjectInstance: jest.Mock;
      loadCoreRecord: jest.Mock;
      applySorBoundInstancePatch: jest.Mock;
    };
    let instantiation: { instantiateProcessIn: jest.Mock };
    let emit: jest.Mock;
    let workflowRouter: ReturnType<typeof createSqlRouter>;

    function customerSorBindingRow(overrides: Record<string, unknown> = {}) {
      return {
        step_object_instance_id: 11,
        step_instance_id: profileStepId,
        binding_id: 21,
        config_object_id: 99,
        config_custom_object_instance_id: null,
        core_id: null,
        status: PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
        binding_mode: PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
        is_mandatory: 1,
        completion_rule: JSON.stringify({ type: 'core_fields_present' }),
        object_type: 'customer',
        config_binding_mode: 'sor_bound',
        ...overrides,
      };
    }

    function customerProcessContext() {
      return {
        tenant_id: tenantId,
        created_by: 9,
        process_instance_id: profileProcessId,
        subject_type: PROCESS_SUBJECT_TYPE_SOR_ENTITY,
        subject_id: customerId,
        subject_metadata: JSON.stringify({
          objectType: 'customer',
          coreId: customerId,
        }),
        context: JSON.stringify({ customerId }),
      };
    }

    beforeEach(async () => {
      jest.clearAllMocks();
      emit = jest.fn();
      instantiation = {
        instantiateProcessIn: jest.fn().mockResolvedValue(profileProcessId),
      };
      configObjectsService = {
        resolveObjectInstance: jest.fn().mockResolvedValue({
          objectType: 'customer',
          coreId: customerId,
          tenantId,
        }),
        loadCoreRecord: jest.fn().mockResolvedValue({
          customerId,
          status: 'pending_profile',
        }),
        applySorBoundInstancePatch: jest.fn().mockResolvedValue({
          core: { customerId, status: 'active' },
          metaJson: {
            profile_completed_at: '2026-06-04T12:00:00.000Z',
            profile_process_instance_id: profileProcessId,
          },
        }),
      };

      const completenessService = {
        isBindingComplete: jest.fn().mockResolvedValue({ valid: true }),
        buildFieldSnapshot: jest.fn().mockResolvedValue({
          fields: { legalName: 'Acme GmbH', vatId: 'DE123' },
          status: 'active',
        }),
      };

      const flags = {
        isSubjectModelEnabled: jest.fn().mockReturnValue(true),
        isTier2InstanceSubjectEnabled: jest.fn().mockReturnValue(true),
        isTier3WorkflowSubjectEnabled: jest.fn().mockReturnValue(true),
        isTier1ScheduledTaskEnabled: jest.fn().mockReturnValue(true),
        isTier4SorEntityEnabled: jest.fn().mockReturnValue(true),
        isConfigObjectStepsEnabled: jest.fn().mockReturnValue(true),
        isStepActionsEnabled: jest.fn().mockReturnValue(true),
      };

      workflowRouter = createSqlRouter([
        {
          match: /FROM process_instance_steps s JOIN process_instances pi/,
          handle: () => [customerProcessContext()],
        },
        {
          match: /oi\.core_id = \?/,
          handle: () => [
            {
              step_object_instance_id: 11,
              step_instance_id: profileStepId,
              config_object_id: 99,
              binding_id: 21,
              core_id: customerId,
              completion_rule: JSON.stringify({ type: 'core_fields_present' }),
              object_type: 'customer',
              config_binding_mode: 'sor_bound',
              tenant_id: tenantId,
              process_instance_id: profileProcessId,
            },
          ],
        },
        {
          match: /FROM process_instance_step_object_instances oi/,
          handle: (_sql, params) => {
            if (params?.[0] === profileStepId) {
              return [customerSorBindingRow()];
            }
            return [];
          },
        },
        {
          match: /SELECT COUNT\(\*\) AS blocking/,
          handle: () => [{ blocking: 0 }],
        },
        {
          match: /FROM process_instance_steps/,
          handle: () => [
            {
              step_instance_id: profileStepId,
              process_instance_id: profileProcessId,
              name: 'Complete profile',
              step_order: 1,
              status: 'completed',
            },
          ],
        },
        {
          match: /FROM process_instances/,
          handle: () => [
            {
              process_instance_id: profileProcessId,
              process_template_id: 10,
              tenant_id: tenantId,
              context: JSON.stringify({ customerId }),
              correlation_id: 'corr-profile',
            },
          ],
        },
      ]);

      const ds = {
        query: workflowRouter.query,
        transaction: jest.fn(
          async (fn: (em: typeof workflowRouter.em) => Promise<unknown>) =>
            fn(workflowRouter.em),
        ),
      } as unknown as DataSource;

      const stepActionRepo = {
        find: jest.fn().mockImplementation(async (opts: { where: unknown }) => {
          const where = opts.where as {
            stepInstanceId: number;
            runOn: string;
          };
          if (
            where.stepInstanceId === profileStepId &&
            where.runOn === PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED
          ) {
            return [
              {
                instanceStepActionId: 501,
                stepInstanceId: profileStepId,
                actionType: PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
                runOn: PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
                isActive: true,
                orderIndex: 0,
                config: {
                  objectType: 'customer',
                  coreIdPath: 'context.customerId',
                  corePatch: { status: 'active' },
                  metaPatch: {
                    profile_completed_at: '2026-06-04T12:00:00.000Z',
                    profile_process_instance_id: profileProcessId,
                  },
                },
              },
            ];
          }
          return [];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProcessLifecycleFacade,
          ProcessHostRegistry,
          ProjectHostAdapter,
          ScheduledTaskHostAdapter,
          ConfigurableInstanceHostAdapter,
          GenericWorkflowHostAdapter,
          SorEntityHostAdapter,
          ProcessCompletionService,
          ConfigObjectStepExecutor,
          ProcessStepActionExecutorService,
          ProcessStepActionOrchestrationService,
          { provide: ProcessInstantiationService, useValue: instantiation },
          { provide: DataSource, useValue: ds },
          { provide: EventsService, useValue: { emit } },
          { provide: ProcessFeatureFlagsService, useValue: flags },
          { provide: ConfigObjectsService, useValue: configObjectsService },
          { provide: ConfigObjectCompletenessService, useValue: completenessService },
          {
            provide: ActionExecutorService,
            useValue: {
              executeEmitEventConfig: jest.fn(),
              executeSendNotificationConfig: jest.fn(),
            },
          },
          { provide: ProcessStepWebhookClient, useValue: { invoke: jest.fn() } },
          {
            provide: ProcessStepActionExecutionLogService,
            useValue: {
              claim: jest.fn().mockResolvedValue({ executionId: 9001 }),
              markSucceeded: jest.fn(),
              markFailed: jest.fn(),
            },
          },
          {
            provide: getRepositoryToken(ProcessInstanceStepActionEntity),
            useValue: stepActionRepo,
          },
          {
            provide: getRepositoryToken(ProcessInstanceStepEntity),
            useValue: { findOne: jest.fn(), find: jest.fn() },
          },
          {
            provide: getRepositoryToken(ProcessInstanceEntity),
            useValue: {
              findOne: jest.fn().mockResolvedValue({
                processInstanceId: profileProcessId,
                processTemplateId: 10,
                tenantId,
                context: { customerId },
                correlationId: 'corr-profile',
              }),
            },
          },
          {
            provide: getRepositoryToken(ConfigCustomObjectInstanceEntity),
            useValue: { findOne: jest.fn() },
          },
        ],
      }).compile();

      facade = module.get(ProcessLifecycleFacade);
      executor = module.get(ConfigObjectStepExecutor);
      orchestration = module.get(ProcessStepActionOrchestrationService);
    });

    it('runs Tier 4 start → SOR binding provision → validation → customer write-back', async () => {
      const startEm = {
        query: jest.fn(async (sql: string) => {
          const n = normalizeSql(sql);
          if (n.includes('FROM process_instance_steps') && n.includes('ORDER BY')) {
            return [{ step_instance_id: profileStepId }];
          }
          if (n.includes('SELECT step_instance_id') && n.includes('LIMIT 1')) {
            return [{ step_instance_id: profileStepId }];
          }
          if (n.includes('UPDATE process_instances SET correlation_id')) {
            return { affectedRows: 1 };
          }
          if (n.includes('SUM(s.status =')) {
            return [{ completed_count: 0, total_count: 1 }];
          }
          return [];
        }),
      };

      const result = await facade.startProcessForSorEntity({
        tenantId,
        createdBy: 9,
        templateId: 10,
        objectType: 'customer',
        coreId: customerId,
        context: { customerId },
        correlationId: 'corr-profile',
        entityManager: startEm as never,
      });

      expect(result.processInstanceId).toBe(profileProcessId);
      expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
        startEm,
        10,
        tenantId,
        9,
        expect.objectContaining({
          subject: expect.objectContaining({
            subjectType: PROCESS_SUBJECT_TYPE_SOR_ENTITY,
            subjectId: customerId,
          }),
        }),
      );
      expect(configObjectsService.resolveObjectInstance).toHaveBeenCalledWith(
        tenantId,
        'customer',
        customerId,
      );

      await executor.provisionBindingsOnStepReady(workflowRouter.qr as never, {
        stepInstanceId: profileStepId,
        correlationId: 'corr-profile',
      });

      expect(configObjectsService.loadCoreRecord).toHaveBeenCalledWith(
        'customer',
        customerId,
      );
      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_step_object_created',
        expect.objectContaining({
          data: expect.objectContaining({
            coreId: customerId,
            objectType: 'customer',
          }),
        }),
      );

      const validation = await executor.validateByCoreLink(
        tenantId,
        'customer',
        customerId,
        'corr-profile',
      );
      expect(validation.anyValid).toBe(true);
      expect(validation.stepInstanceIds).toContain(profileStepId);

      await expect(
        executor.areMandatoryBindingsValid(workflowRouter.em, profileStepId),
      ).resolves.toBe(true);

      await orchestration.runProcessCompleted(profileProcessId, {
        correlationId: 'corr-profile',
        actorUserId: 9,
      });

      expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith({
        tenantId,
        objectType: 'customer',
        coreId: customerId,
        corePatch: { status: 'active' },
        metaPatch: {
          profile_completed_at: '2026-06-04T12:00:00.000Z',
          profile_process_instance_id: profileProcessId,
        },
        customerId: undefined,
      });
    });
  });

  describe('J2 — tenant onboarding (event start rules + workflow + call_process children)', () => {
    const parentProcessId = 1000;
    const childProcessId = 2001;
    const parentStepId = 50;
    const childTemplateId = 11;

    let startEngine: ProcessStartRuleEngineService;
    let childOrchestration: ChildProcessOrchestrationService;
    let lifecycle: ProcessLifecycleFacade;
    let emit: jest.Mock;
    let startProcessSpy: jest.SpyInstance;
    let runStepCompleted: jest.Mock;

    beforeEach(async () => {
      jest.clearAllMocks();
      emit = jest.fn();
      runStepCompleted = jest.fn().mockResolvedValue(undefined);

      const rulesService = {
        findActiveRulesForEvent: jest.fn().mockResolvedValue([
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
        ]),
      };

      const instantiation = {
        instantiateProcessIn: jest
          .fn()
          .mockResolvedValueOnce(parentProcessId)
          .mockResolvedValueOnce(childProcessId),
      };

      const flags = {
        isEventStartRegistryEnabled: jest.fn().mockReturnValue(true),
        isCallProcessEnabled: jest.fn().mockReturnValue(true),
        isSubjectModelEnabled: jest.fn().mockReturnValue(true),
        isTier3WorkflowSubjectEnabled: jest.fn().mockReturnValue(true),
      };

      const lifecycleStartQuery = jest.fn(async (sql: string) => {
        const n = normalizeSql(sql);
        if (n.includes('FROM process_instance_steps') && n.includes('ORDER BY')) {
          return [{ step_instance_id: 501 }];
        }
        if (n.includes('UPDATE process_instances SET correlation_id')) {
          return { affectedRows: 1 };
        }
        if (n.includes('UPDATE process_instances SET subject_id')) {
          return { affectedRows: 1 };
        }
        return [];
      });

      const lifecycleModule: TestingModule = await Test.createTestingModule({
        providers: [
          ProcessLifecycleFacade,
          ProcessHostRegistry,
          ProjectHostAdapter,
          ScheduledTaskHostAdapter,
          ConfigurableInstanceHostAdapter,
          GenericWorkflowHostAdapter,
          SorEntityHostAdapter,
          ProcessCompletionService,
          { provide: ProcessInstantiationService, useValue: instantiation },
          { provide: EventsService, useValue: { emit } },
          { provide: ProcessFeatureFlagsService, useValue: flags },
          {
            provide: ConfigObjectsService,
            useValue: { resolveObjectInstance: jest.fn() },
          },
          {
            provide: ConfigObjectStepExecutor,
            useValue: {
              areMandatoryBindingsValid: jest.fn().mockResolvedValue(true),
            },
          },
          {
            provide: getRepositoryToken(ConfigCustomObjectInstanceEntity),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: DataSource,
            useValue: {
              transaction: jest.fn(
                async (
                  _iso: string,
                  fn: (em: { query: jest.Mock }) => Promise<unknown>,
                ) => fn({ query: lifecycleStartQuery }),
              ),
            },
          },
        ],
      }).compile();

      lifecycle = lifecycleModule.get(ProcessLifecycleFacade);
      startProcessSpy = jest.spyOn(lifecycle, 'startProcess');

      const startModule: TestingModule = await Test.createTestingModule({
        providers: [
          ProcessStartRuleEngineService,
          { provide: ProcessStartRulesService, useValue: rulesService },
          { provide: ProcessLifecycleFacade, useValue: lifecycle },
          {
            provide: ProcessStartRuleDedupService,
            useValue: {
              findBlockingActiveProcess: jest.fn().mockResolvedValue(null),
            },
          },
          { provide: ProcessFeatureFlagsService, useValue: flags },
          {
            provide: EventCatalogService,
            useValue: { resolveCanonicalEventName: jest.fn((n: string) => n) },
          },
        ],
      }).compile();

      startEngine = startModule.get(ProcessStartRuleEngineService);

      const childQuery = jest.fn(async (sql: string, params?: unknown[]) => {
        const n = normalizeSql(sql);

        if (n.includes('FROM process_instances') && params?.[0] === childProcessId) {
          return [
            {
              process_instance_id: childProcessId,
              tenant_id: 42,
              created_by: 5,
              subject_type: PROCESS_SUBJECT_TYPE_WORKFLOW,
              subject_id: childProcessId,
              subject_metadata: null,
              context: JSON.stringify({ kycStatus: 'approved' }),
              on_child_failure: 'pause_parent',
              correlation_id: 'corr-tenant-42',
              parent_instance_id: parentProcessId,
              parent_step_id: parentStepId,
            },
          ];
        }

        if (n.includes('FROM process_instances') && params?.[0] === parentProcessId) {
          return [
            {
              process_instance_id: parentProcessId,
              tenant_id: 42,
              created_by: 5,
              subject_type: PROCESS_SUBJECT_TYPE_WORKFLOW,
              subject_id: parentProcessId,
              subject_metadata: null,
              context: JSON.stringify({ tenantId: 42 }),
              on_child_failure: 'pause_parent',
              correlation_id: 'corr-tenant-42',
              parent_instance_id: null,
              parent_step_id: null,
            },
          ];
        }

        if (n.includes('UPDATE process_instances SET context')) {
          return { affectedRows: 1 };
        }

        if (n.includes("SET status = 'completed'") && n.includes('process_instance_steps')) {
          return { affectedRows: 1 };
        }

        if (n.includes('SELECT process_instance_id, step_order')) {
          return [{ process_instance_id: parentProcessId, step_order: 1 }];
        }

        return [];
      });

      const childDs = {
        transaction: jest.fn(
          async (_iso: string, fn: (em: { query: jest.Mock }) => Promise<void>) =>
            fn({ query: childQuery }),
        ),
        query: childQuery,
      } as unknown as DataSource;

      const childModule: TestingModule = await Test.createTestingModule({
        providers: [
          ChildProcessOrchestrationService,
          { provide: DataSource, useValue: childDs },
          { provide: ProcessLifecycleFacade, useValue: lifecycle },
          { provide: EventsService, useValue: { emit } },
          { provide: ProcessFeatureFlagsService, useValue: flags },
          {
            provide: ProcessStepActionOrchestrationService,
            useValue: {
              runStepCompleted,
              runStepFailed: jest.fn(),
              runProcessCompleted: jest.fn(),
            },
          },
        ],
      }).compile();

      childOrchestration = childModule.get(ChildProcessOrchestrationService);
    });

    it('tenant.created → workflow parent → call_process child → parent resumes on child complete', async () => {
      const envelope = {
        eventName: PLATFORM_EVENT_NAMES.TENANT_CREATED,
        tenantId: 42,
        entity: { entityType: 'tenant', entityId: 42 },
        createdBy: 5,
        correlationId: 'corr-tenant-42',
      };

      const startResults = await startEngine.process(envelope, {
        recordId: 88,
      } as never);
      expect(startResults[0].status).toBe('started');
      expect(startResults[0].processInstanceId).toBe(parentProcessId);

      const spawnEm = {
        query: jest.fn(async (sql: string, params?: unknown[]) => {
          const n = normalizeSql(sql);
          if (n.includes('parent_step_id IS NOT NULL') && params?.[0] === parentStepId) {
            return [];
          }
          if (n.includes('FROM process_instances') && params?.[0] === parentProcessId) {
            return [
              {
                process_instance_id: parentProcessId,
                tenant_id: 42,
                created_by: 5,
                subject_type: PROCESS_SUBJECT_TYPE_WORKFLOW,
                subject_id: parentProcessId,
                subject_metadata: null,
                context: JSON.stringify({ tenantId: 42 }),
                on_child_failure: 'pause_parent',
                correlation_id: 'corr-tenant-42',
              },
            ];
          }
          if (n.includes('FROM process_template_steps')) {
            return [
              {
                child_template_id: childTemplateId,
                child_subject_policy: CHILD_SUBJECT_POLICY_WORKFLOW,
                child_context_patch: JSON.stringify({ onboardingPhase: 'kyc' }),
              },
            ];
          }
          if (n.includes('UPDATE process_instance_steps')) {
            return { affectedRows: 1 };
          }
          if (n.includes('UPDATE process_instances SET correlation_id')) {
            return { affectedRows: 1 };
          }
          if (n.includes('FROM process_instance_steps') && n.includes('ORDER BY')) {
            return [{ step_instance_id: 501 }];
          }
          if (n.includes('SELECT step_instance_id') && n.includes('LIMIT 1')) {
            return [{ step_instance_id: 501 }];
          }
          return [];
        }),
      };

      const spawned = await childOrchestration.spawnChildAndBlockParent(
        { manager: spawnEm } as never,
        {
          step_instance_id: parentStepId,
          process_instance_id: parentProcessId,
          process_template_step_id: 301,
          step_order: 1,
          status: 'ready',
          task_type: PROCESS_STEP_TASK_TYPE_CALL_PROCESS,
        },
        { correlationId: 'corr-tenant-42', actorTenantUserId: 5 },
      );

      expect(spawned).toBe(true);
      expect(startProcessSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: childTemplateId,
          subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
          parentInstanceId: parentProcessId,
          parentStepId: parentStepId,
          context: expect.objectContaining({
            tenantId: 42,
            onboardingPhase: 'kyc',
            parentProcessInstanceId: parentProcessId,
          }),
        }),
      );
      expect(emit).toHaveBeenCalledWith(
        PLATFORM_EVENT_NAMES.PROCESS_CHILD_STARTED,
        expect.objectContaining({
          data: expect.objectContaining({
            childProcessInstanceId: childProcessId,
            parentProcessInstanceId: parentProcessId,
          }),
        }),
      );

      await childOrchestration.handleChildTerminal(childProcessId, 'completed', {
        correlationId: 'corr-tenant-42',
      });

      expect(emit).toHaveBeenCalledWith(
        PLATFORM_EVENT_NAMES.PROCESS_CHILD_COMPLETED,
        expect.objectContaining({
          data: expect.objectContaining({ resumedParent: true }),
        }),
      );
      expect(runStepCompleted).toHaveBeenCalledWith(
        parentStepId,
        expect.objectContaining({ correlationId: 'corr-tenant-42' }),
      );
    });
  });

  describe('J3 — cross-entity (mixed standalone + SOR bindings)', () => {
    const mixedStepId = 401;
    const standaloneInstanceId = 77;

    let executor: ConfigObjectStepExecutor;
    let emit: jest.Mock;
    let workflowRouter: ReturnType<typeof createSqlRouter>;

    beforeEach(async () => {
      jest.clearAllMocks();
      emit = jest.fn();

      const configObjectsService = {
        loadCoreRecord: jest.fn().mockResolvedValue({ customerId, status: 'active' }),
        resolveObjectInstance: jest.fn().mockResolvedValue({
          objectType: 'customer',
          coreId: customerId,
        }),
      };

      const completenessService = {
        isBindingComplete: jest.fn().mockResolvedValue({ valid: true }),
        buildFieldSnapshot: jest.fn().mockResolvedValue({
          fields: { legalName: 'Acme' },
        }),
      };

      const mixedBindingRows = [
        {
          step_object_instance_id: 10,
          step_instance_id: mixedStepId,
          binding_id: 11,
          config_object_id: 88,
          config_custom_object_instance_id: null,
          core_id: null,
          status: PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
          binding_mode: 'create_on_enter',
          is_mandatory: 1,
          completion_rule: JSON.stringify({ type: 'payload_valid' }),
          object_type: 'invoice_submission',
          config_binding_mode: 'standalone',
        },
        {
          step_object_instance_id: 12,
          step_instance_id: mixedStepId,
          binding_id: 13,
          config_object_id: 99,
          config_custom_object_instance_id: null,
          core_id: null,
          status: PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
          binding_mode: PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
          is_mandatory: 1,
          completion_rule: JSON.stringify({ type: 'core_fields_present' }),
          object_type: 'customer',
          config_binding_mode: 'sor_bound',
        },
      ];

      workflowRouter = createSqlRouter([
        {
          match: /FROM process_instance_steps s JOIN process_instances pi/,
          handle: () => [
            {
              tenant_id: tenantId,
              created_by: 2,
              process_instance_id: 500,
              subject_type: PROCESS_SUBJECT_TYPE_SOR_ENTITY,
              subject_id: customerId,
              subject_metadata: JSON.stringify({
                objectType: 'customer',
                coreId: customerId,
              }),
              context: JSON.stringify({ customerId }),
            },
          ],
        },
        {
          match: /oi\.core_id = \?/,
          handle: () => [
            {
              step_object_instance_id: 12,
              step_instance_id: mixedStepId,
              config_object_id: 99,
              binding_id: 13,
              core_id: customerId,
              completion_rule: JSON.stringify({ type: 'core_fields_present' }),
              object_type: 'customer',
              config_binding_mode: 'sor_bound',
              tenant_id: tenantId,
              process_instance_id: 500,
            },
          ],
        },
        {
          match: /config_custom_object_instance_id = \?/,
          handle: () => [
            {
              step_object_instance_id: 10,
              step_instance_id: mixedStepId,
              config_object_id: 88,
              binding_id: 11,
              completion_rule: JSON.stringify({ type: 'payload_valid' }),
              object_type: 'invoice_submission',
              tenant_id: tenantId,
              process_instance_id: 500,
            },
          ],
        },
        {
          match: /FROM process_instance_step_object_instances oi/,
          handle: (_sql, params) => {
            if (params?.[0] === mixedStepId) {
              return mixedBindingRows;
            }
            return [];
          },
        },
        {
          match: /INSERT INTO config_custom_object_instances/,
          handle: () => ({ insertId: standaloneInstanceId }),
        },
        {
          match: /SELECT payload, status FROM config_custom_object_instances/,
          handle: () => [
            { payload: { amount: 1500, currency: 'EUR' }, status: 'DRAFT' },
          ],
        },
        {
          match: /SELECT COUNT\(\*\) AS blocking/,
          handle: () => [{ blocking: 0 }],
        },
      ]);

      const ds = {
        query: workflowRouter.query,
        transaction: jest.fn(
          async (fn: (em: typeof workflowRouter.em) => Promise<unknown>) =>
            fn(workflowRouter.em),
        ),
      } as unknown as DataSource;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConfigObjectStepExecutor,
          { provide: DataSource, useValue: ds },
          { provide: EventsService, useValue: { emit } },
          {
            provide: ProcessFeatureFlagsService,
            useValue: { isConfigObjectStepsEnabled: jest.fn().mockReturnValue(true) },
          },
          { provide: ConfigObjectsService, useValue: configObjectsService },
          { provide: ConfigObjectCompletenessService, useValue: completenessService },
        ],
      }).compile();

      executor = module.get(ConfigObjectStepExecutor);
    });

    it('provisions standalone + sor_bound bindings and gates step completion on both', async () => {
      await executor.provisionBindingsOnStepReady(workflowRouter.qr as never, {
        stepInstanceId: mixedStepId,
        correlationId: 'corr-mixed',
      });

      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_step_object_created',
        expect.objectContaining({
          data: expect.objectContaining({
            configCustomObjectInstanceId: standaloneInstanceId,
          }),
        }),
      );
      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_step_object_created',
        expect.objectContaining({
          data: expect.objectContaining({
            coreId: customerId,
            objectType: 'customer',
          }),
        }),
      );

      const standaloneValidation = await executor.validateByCustomInstanceId(
        standaloneInstanceId,
        2,
        'corr-mixed',
      );
      expect(standaloneValidation.valid).toBe(true);
      expect(standaloneValidation.stepInstanceId).toBe(mixedStepId);

      const sorValidation = await executor.validateByCoreLink(
        tenantId,
        'customer',
        customerId,
        'corr-mixed',
      );
      expect(sorValidation.anyValid).toBe(true);

      await expect(
        executor.areMandatoryBindingsValid(workflowRouter.em, mixedStepId),
      ).resolves.toBe(true);
    });
  });
});
