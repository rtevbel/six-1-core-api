import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessRunnerService } from './process-runner.service';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { ProcessStepPermissionService } from './process-step-permission.service';
import { ProcessStepAssigneeService } from '../automation/process-step-assignee.service';
import { ProcessStepExtensionEvaluatorService } from '../automation/process-step-extension-evaluator.service';
import type { ProcessRunnerPayload } from './interfaces/process-runner-payload.interface';

describe('ProcessRunnerService', () => {
  let service: ProcessRunnerService;
  const query = jest.fn();
  const findOne = jest.fn();
  const callerHasRequiredPermissions = jest.fn();
  const loadAssigneesByStepIds = jest.fn();
  const evaluateExtensions = jest.fn();
  const isRunnerV2Enabled = jest.fn();

  const parentInstance = {
    processInstanceId: 500,
    processTemplateId: 9,
    tenantId: 1,
    status: 'active',
    subjectType: 'workflow',
    subjectId: 500,
    subjectMetadata: { intent: 'invoice' },
    context: { customerId: 12 },
    correlationId: 'corr-1',
    parentInstanceId: null,
    startedAt: new Date('2026-01-01T09:00:00.000Z'),
    completedAt: null,
    canceledAt: null,
  };

  const childInstance = {
    processInstanceId: 600,
    processTemplateId: 19,
    tenantId: 1,
    status: 'active',
    subjectType: 'workflow',
    subjectId: 600,
    subjectMetadata: { childIntent: 'profile' },
    context: { profileSection: 'billing' },
    correlationId: 'corr-child',
    parentInstanceId: 500,
    startedAt: new Date('2026-01-01T10:30:00.000Z'),
    completedAt: null,
    canceledAt: null,
  };

  function mockRunnerQueries(): void {
    query.mockImplementation(async (sql: string, params?: unknown[]) => {
      const n = sql.replace(/\s+/g, ' ').trim();
      const scopedInstanceId = Number(params?.[0]);

      if (n.includes('FROM process_instance_steps') && n.includes('GROUP BY')) {
        const childId = Number(params?.[0]);
        if (childId === 600) {
          return [
            {
              process_instance_id: 600,
              total_steps: 3,
              completed_steps: 1,
              canceled_steps: 0,
            },
          ];
        }
        return [];
      }

      if (
        n.includes('FROM process_instance_steps') &&
        n.includes("status IN ('ready'")
      ) {
        if (params?.includes(600)) {
          return [
            {
              process_instance_id: 600,
              step_instance_id: 201,
              name: 'Child review',
              step_order: 2,
              status: 'ready',
            },
          ];
        }
        return [];
      }

      if (n.includes('FROM process_instance_steps')) {
        if (scopedInstanceId === 600) {
          return [
            {
              step_instance_id: 201,
              process_instance_id: 600,
              process_template_step_id: 21,
              step_order: 1,
              name: 'Child capture',
              task_type: 'manual',
              status: 'ready',
              is_optional: 0,
              blocked_reason: '',
              required_permissions: null,
              ready_at: new Date('2026-01-01T11:00:00.000Z'),
              started_at: null,
              completed_at: null,
              canceled_at: null,
              step_extensions_json: null,
            },
          ];
        }

        return [
          {
            step_instance_id: 101,
            process_instance_id: 500,
            process_template_step_id: 11,
            step_order: 1,
            name: 'Capture',
            task_type: 'manual',
            status: 'ready',
            is_optional: 0,
            blocked_reason: '',
            required_permissions: ['process_templates.manage'],
            ready_at: new Date('2026-01-01T10:00:00.000Z'),
            started_at: null,
            completed_at: null,
            canceled_at: null,
            step_extensions_json: null,
          },
        ];
      }

      if (n.includes('FROM process_instance_step_requirements')) {
        if (params?.some((value) => value === 201)) {
          return [];
        }
        return [
          {
            requirementInstanceId: 1,
            stepInstanceId: 101,
            processTemplateStepRequirementId: 10,
            requirementType: 'document',
            requirementKey: 'upload',
            jsonSchema: { type: 'object' },
            isMandatory: 1,
            status: 'none',
            lastSubmissionId: null,
            approvedAt: null,
          },
        ];
      }

      if (n.includes('FROM process_instance_step_triggers')) {
        if (params?.some((value) => value === 201)) {
          return [];
        }
        return [
          {
            triggerInstanceId: 2,
            stepInstanceId: 101,
            processTemplateStepTriggerConditionId: 20,
            conditionType: 'event',
            conditionKey: 'evt',
            jsonSchema: { type: 'event' },
            status: 'unmet',
            metAt: null,
          },
        ];
      }

      if (n.includes('FROM process_instance_step_object_instances')) {
        if (params?.some((value) => value === 201)) {
          return [];
        }
        return [
          {
            step_object_instance_id: 30,
            step_instance_id: 101,
            binding_id: 11,
            config_object_id: 99,
            config_custom_object_instance_id: 77,
            status: 'active',
            last_error: null,
            object_type: 'invoice_submission',
          },
        ];
      }

      if (n.includes('WHERE parent_instance_id')) {
        if (scopedInstanceId === 500) {
          return [
            {
              process_instance_id: 600,
              process_template_id: 19,
              parent_step_id: 101,
              status: 'active',
              subject_type: 'workflow',
              subject_id: 600,
              subject_metadata: { childIntent: 'profile' },
              correlation_id: 'corr-child',
              started_at: new Date('2026-01-01T10:30:00.000Z'),
              completed_at: null,
              canceled_at: null,
            },
          ];
        }
        return [];
      }

      if (n.includes('FROM process_step_execution_log')) {
        return [];
      }

      return [];
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    callerHasRequiredPermissions.mockResolvedValue(true);
    loadAssigneesByStepIds.mockResolvedValue(
      new Map([
        [
          101,
          [{ stepInstanceId: 101, tenantUserId: 42, assignmentOrder: 0 }],
        ],
      ]),
    );
    isRunnerV2Enabled.mockReturnValue(false);
    evaluateExtensions.mockImplementation(({ extensions }) => ({
      isVisible: true,
      autoAdvanceEligible: false,
      visibleWhenResult: extensions?.visibleWhen ? true : null,
      autoAdvanceWhenResult: null,
    }));
    findOne.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.processInstanceId === 500) {
        return parentInstance;
      }
      if (where.processInstanceId === 600 && where.tenantId === 1) {
        return childInstance;
      }
      return null;
    });
    mockRunnerQueries();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessRunnerService,
        {
          provide: getRepositoryToken(ProcessInstanceEntity),
          useValue: { findOne },
        },
        {
          provide: DataSource,
          useValue: { query },
        },
        {
          provide: ProcessStepPermissionService,
          useValue: { callerHasRequiredPermissions },
        },
        {
          provide: ProcessStepAssigneeService,
          useValue: { loadAssigneesByStepIds },
        },
        {
          provide: ProcessStepExtensionEvaluatorService,
          useValue: {
            evaluate: evaluateExtensions,
            isEnabled: isRunnerV2Enabled,
          },
        },
      ],
    }).compile();

    service = module.get(ProcessRunnerService);
  });

  it('throws when process instance is missing', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.buildPayload(1, 999)).rejects.toThrow(RpcException);
  });

  it('returns a stable v1 runner payload shape', async () => {
    const payload = await service.buildPayload(2, 500);

    expect(payload).toMatchObject({
      processInstanceId: 500,
      processTemplateId: 9,
      tenantId: 1,
      status: 'active',
      startedAt: '2026-01-01T09:00:00.000Z',
      completedAt: null,
      canceledAt: null,
      subject: { type: 'workflow', id: 500, metadata: { intent: 'invoice' } },
      context: { customerId: 12 },
      correlationId: 'corr-1',
      currentStepInstanceId: 101,
    });

    expect(payload.children).toHaveLength(1);
    expect(payload.children[0]).toMatchObject({
      processInstanceId: 600,
      processTemplateId: 19,
      parentStepInstanceId: 101,
      parentStepOrder: 1,
      parentStepName: 'Capture',
      status: 'active',
      subjectType: 'workflow',
      subjectId: 600,
      subject: {
        type: 'workflow',
        id: 600,
        metadata: { childIntent: 'profile' },
      },
      correlationId: 'corr-child',
      progress: {
        totalSteps: 3,
        completedSteps: 1,
        canceledSteps: 0,
        currentStepInstanceId: 201,
        currentStepName: 'Child review',
      },
    });

    expect(payload.children[0].runner).toBeUndefined();

    expect(payload.steps).toHaveLength(1);
    const step = payload.steps[0];
    expect(step).toMatchObject({
      stepInstanceId: 101,
      processTemplateStepId: 11,
      stepOrder: 1,
      name: 'Capture',
      stepType: 'manual',
      status: 'ready',
      readyAt: '2026-01-01T10:00:00.000Z',
      childProcessInstanceId: 600,
      childProcessActive: true,
      requiredPermissions: ['process_templates.manage'],
      callerCanComplete: true,
      canComplete: true,
      primaryAssigneeId: 42,
      assignees: [
        { tenantUserId: 42, assignmentOrder: 0, isPrimary: true },
      ],
      isVisible: true,
      canSkip: false,
      autoAdvanceEligible: false,
      lastFailure: null,
    });
    expect(evaluateExtensions).toHaveBeenCalledWith(
      expect.objectContaining({
        processContext: { customerId: 12 },
        subject: { type: 'workflow', id: 500, metadata: { intent: 'invoice' } },
        extensions: undefined,
      }),
    );
    expect(callerHasRequiredPermissions).toHaveBeenCalledWith(
      2,
      ['process_templates.manage'],
      undefined,
    );
    expect(step.requirements).toHaveLength(1);
    expect(step.requirements[0]).toMatchObject({
      requirementInstanceId: 1,
      requirementType: 'document',
      status: 'none',
    });
    expect(step.triggers[0]).toMatchObject({
      triggerInstanceId: 2,
      status: 'unmet',
    });
    expect(step.objectBindings[0]).toMatchObject({
      stepObjectInstanceId: 30,
      configObjectId: 99,
      objectType: 'invoice_submission',
      instanceId: 77,
      status: 'active',
      schemaRef: 'invoice_submission',
    });

    assertRunnerPayloadContract(payload);
  });

  it('embeds nested child runner payloads when childDepth is 1', async () => {
    const payload = await service.buildPayload(2, 500, 1, undefined, 1);

    expect(payload.children).toHaveLength(1);
    expect(payload.children[0].runner).toMatchObject({
      processInstanceId: 600,
      processTemplateId: 19,
      parentInstanceId: 500,
      correlationId: 'corr-child',
      currentStepInstanceId: 201,
    });
    expect(payload.children[0].runner?.steps).toHaveLength(1);
    expect(payload.children[0].runner?.steps[0]).toMatchObject({
      stepInstanceId: 201,
      name: 'Child capture',
      status: 'ready',
    });
    expect(payload.children[0].runner?.children).toEqual([]);
  });

  it('clamps childDepth above the configured maximum', async () => {
    const payload = await service.buildPayload(2, 500, 1, undefined, 99);

    expect(payload.children[0].runner).toMatchObject({
      processInstanceId: 600,
    });
  });

  it('scopes lookup by tenantId when provided', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.buildPayload(1, 500, 2)).rejects.toThrow(RpcException);

    expect(findOne).toHaveBeenCalledWith({
      where: { processInstanceId: 500, tenantId: 2 },
    });
  });

  it('populates v2 extension fields when runner v2 is enabled', async () => {
    isRunnerV2Enabled.mockReturnValue(true);
    evaluateExtensions.mockReturnValue({
      isVisible: false,
      autoAdvanceEligible: true,
      visibleWhenResult: false,
      autoAdvanceWhenResult: true,
    });

    query.mockImplementation(async (sql: string, params?: unknown[]) => {
      const n = sql.replace(/\s+/g, ' ').trim();
      if (n.includes('FROM process_instance_steps') && !n.includes('GROUP BY') && !n.includes("status IN ('ready'")) {
        return [
          {
            step_instance_id: 101,
            process_instance_id: 500,
            process_template_step_id: 11,
            step_order: 1,
            name: 'Capture',
            task_type: 'manual',
            status: 'ready',
            is_optional: 1,
            blocked_reason: '',
            required_permissions: null,
            ready_at: new Date('2026-01-01T10:00:00.000Z'),
            started_at: null,
            completed_at: null,
            canceled_at: null,
            step_extensions_json: {
              allowSkip: true,
              visibleWhen: { '==': [1, 0] },
              ui: { icon: 'check' },
            },
          },
        ];
      }
      if (n.includes('WHERE parent_instance_id')) {
        return [];
      }
      if (n.includes('FROM process_instance_step_requirements')) {
        return [];
      }
      if (n.includes('FROM process_instance_step_triggers')) {
        return [];
      }
      if (n.includes('FROM process_instance_step_object_instances')) {
        return [];
      }
      return [];
    });

    const payload = await service.buildPayload(2, 500);

    expect(payload.steps[0]).toMatchObject({
      isVisible: false,
      canSkip: false,
      autoAdvanceEligible: true,
      extensions: {
        allowSkip: true,
        visibleWhen: { '==': [1, 0] },
        ui: { icon: 'check' },
      },
    });
    expect(payload.currentStepInstanceId).toBeNull();
  });

  it('sets canSkip when v2 enabled, allowSkip, permissions, and visible', async () => {
    isRunnerV2Enabled.mockReturnValue(true);
    evaluateExtensions.mockReturnValue({
      isVisible: true,
      autoAdvanceEligible: false,
      visibleWhenResult: true,
      autoAdvanceWhenResult: null,
    });

    query.mockImplementation(async (sql: string) => {
      const n = sql.replace(/\s+/g, ' ').trim();
      if (n.includes('FROM process_instance_steps') && !n.includes('GROUP BY') && !n.includes("status IN ('ready'")) {
        return [
          {
            step_instance_id: 101,
            process_instance_id: 500,
            process_template_step_id: 11,
            step_order: 1,
            name: 'Capture',
            task_type: 'manual',
            status: 'in_progress',
            is_optional: 0,
            blocked_reason: '',
            required_permissions: null,
            ready_at: null,
            started_at: new Date('2026-01-01T10:00:00.000Z'),
            completed_at: null,
            canceled_at: null,
            step_extensions_json: { allowSkip: true },
          },
        ];
      }
      if (
        n.includes('FROM process_instance_step_requirements') ||
        n.includes('FROM process_instance_step_triggers') ||
        n.includes('FROM process_instance_step_object_instances') ||
        n.includes('WHERE parent_instance_id')
      ) {
        return [];
      }
      return [];
    });

    const payload = await service.buildPayload(2, 500);

    expect(payload.steps[0].canSkip).toBe(true);
  });
});

/** Contract guard for gateway / frontend snapshots. */
function assertRunnerPayloadContract(payload: ProcessRunnerPayload): void {
  expect(typeof payload.processInstanceId).toBe('number');
  expect(typeof payload.status).toBe('string');
  expect(payload.subject).toEqual(
    expect.objectContaining({
      type: expect.any(String),
      id: expect.any(Number),
    }),
  );
  expect(Array.isArray(payload.steps)).toBe(true);
  expect(Array.isArray(payload.children)).toBe(true);

  for (const step of payload.steps) {
    expect(typeof step.stepInstanceId).toBe('number');
    expect(typeof step.processTemplateStepId).toBe('number');
    expect(typeof step.stepOrder).toBe('number');
    expect(typeof step.stepType).toBe('string');
    expect(Array.isArray(step.requiredPermissions)).toBe(true);
    expect(typeof step.callerCanComplete).toBe('boolean');
    expect(typeof step.canComplete).toBe('boolean');
    expect(Array.isArray(step.assignees)).toBe(true);
    expect(Array.isArray(step.requirements)).toBe(true);
    expect(Array.isArray(step.triggers)).toBe(true);
    expect(Array.isArray(step.objectBindings)).toBe(true);
    expect(typeof step.isVisible).toBe('boolean');
    expect(typeof step.canSkip).toBe('boolean');
    expect(typeof step.autoAdvanceEligible).toBe('boolean');
    expect(step.lastFailure === null || typeof step.lastFailure === 'object').toBe(
      true,
    );
  }

  for (const child of payload.children) {
    expect(typeof child.processTemplateId).toBe('number');
    expect(typeof child.parentStepOrder).toBe('number');
    expect(child.subject).toEqual(
      expect.objectContaining({
        type: expect.any(String),
        id: expect.any(Number),
      }),
    );
    expect(child.progress).toEqual(
      expect.objectContaining({
        totalSteps: expect.any(Number),
        completedSteps: expect.any(Number),
        currentStepInstanceId: expect.anything(),
      }),
    );

    if (child.runner) {
      assertRunnerPayloadContract(child.runner);
    }
  }

  if (payload.currentStepInstanceId != null) {
    expect(payload.steps.some((s) => s.stepInstanceId === payload.currentStepInstanceId)).toBe(
      true,
    );
  }
}
