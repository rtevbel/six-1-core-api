import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessRunnerService } from './process-runner.service';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import type { ProcessRunnerPayload } from './interfaces/process-runner-payload.interface';

describe('ProcessRunnerService', () => {
  let service: ProcessRunnerService;
  const query = jest.fn();
  const findOne = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

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
      ],
    }).compile();

    service = module.get(ProcessRunnerService);
  });

  it('throws when process instance is missing', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.buildPayload(1, 999)).rejects.toThrow(RpcException);
  });

  it('returns a stable v1 runner payload shape', async () => {
    findOne.mockResolvedValue({
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
    });

    query.mockImplementation(async (sql: string) => {
      const n = sql.replace(/\s+/g, ' ').trim();

      if (n.includes('FROM process_instance_steps')) {
        return [
          {
            step_instance_id: 101,
            process_instance_id: 500,
            step_order: 1,
            name: 'Capture',
            task_type: 'manual',
            status: 'ready',
            is_optional: 0,
            blocked_reason: '',
          },
        ];
      }

      if (n.includes('FROM process_instance_step_requirements')) {
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
        return [
          {
            process_instance_id: 600,
            parent_step_id: 101,
            status: 'active',
            subject_type: 'workflow',
            subject_id: 600,
          },
        ];
      }

      return [];
    });

    const payload = await service.buildPayload(2, 500);

    expect(payload).toMatchObject({
      processInstanceId: 500,
      processTemplateId: 9,
      tenantId: 1,
      status: 'active',
      subject: { type: 'workflow', id: 500, metadata: { intent: 'invoice' } },
      context: { customerId: 12 },
      correlationId: 'corr-1',
      currentStepInstanceId: 101,
    });

    expect(payload.children).toHaveLength(1);
    expect(payload.children[0]).toMatchObject({
      processInstanceId: 600,
      parentStepInstanceId: 101,
    });

    expect(payload.steps).toHaveLength(1);
    const step = payload.steps[0];
    expect(step).toMatchObject({
      stepInstanceId: 101,
      stepOrder: 1,
      name: 'Capture',
      stepType: 'manual',
      status: 'ready',
      childProcessInstanceId: 600,
    });
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

  it('scopes lookup by tenantId when provided', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.buildPayload(1, 500, 2)).rejects.toThrow(RpcException);

    expect(findOne).toHaveBeenCalledWith({
      where: { processInstanceId: 500, tenantId: 2 },
    });
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
    expect(typeof step.stepOrder).toBe('number');
    expect(typeof step.stepType).toBe('string');
    expect(Array.isArray(step.requirements)).toBe(true);
    expect(Array.isArray(step.triggers)).toBe(true);
    expect(Array.isArray(step.objectBindings)).toBe(true);
  }

  if (payload.currentStepInstanceId != null) {
    expect(payload.steps.some((s) => s.stepInstanceId === payload.currentStepInstanceId)).toBe(
      true,
    );
  }
}
