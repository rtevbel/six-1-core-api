import { Test, TestingModule } from '@nestjs/testing';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';
import { createEmptyNotificationContext } from './notification-context.types';
import { NotificationProcessContextLoader } from './notification-process-context.loader';
import { WorkflowContextProvider } from './providers/workflow-context.provider';

describe('WorkflowContextProvider', () => {
  let provider: WorkflowContextProvider;
  let processLoader: jest.Mocked<NotificationProcessContextLoader>;
  let configObjectsService: jest.Mocked<
    Pick<ConfigObjectsService, 'resolveObjectInstance'>
  >;

  beforeEach(async () => {
    processLoader = {
      loadProcessInstance: jest.fn(),
      loadStepInstance: jest.fn(),
    } as unknown as jest.Mocked<NotificationProcessContextLoader>;
    configObjectsService = { resolveObjectInstance: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowContextProvider,
        { provide: NotificationProcessContextLoader, useValue: processLoader },
        { provide: ConfigObjectsService, useValue: configObjectsService },
      ],
    }).compile();

    provider = module.get(WorkflowContextProvider);
  });

  it('merges process instance context with payload context', async () => {
    processLoader.loadProcessInstance.mockResolvedValue({
      processInstanceId: 42,
      subjectType: 'project',
      subjectId: 1001,
      context: { intent: 'onboarding' },
    } as ProcessInstanceEntity);

    const context = createEmptyNotificationContext();
    context.process.instanceId = 42;

    await provider.apply(
      context,
      {
        eventName: 'six1-event.process_step_ready',
        occurredAt: null,
        correlationId: null,
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 20,
        payload: {
          processInstanceId: 42,
          context: { customerId: 7712 },
        },
        entityType: null,
        entityId: null,
      },
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.process_step_ready',
            data: {
              processInstanceId: 42,
              context: { customerId: 7712 },
            },
          },
        },
        recipientUserId: 20,
      },
      { requiredPaths: ['workflow.context.customerId'] },
    );

    expect(context.workflow.subjectType).toBe('project');
    expect(context.workflow.subjectId).toBe(1001);
    expect(context.workflow.context).toEqual({
      intent: 'onboarding',
      customerId: 7712,
    });
  });
});
