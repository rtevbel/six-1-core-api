import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NOTIFICATION_PUBLIC_BASE_URL_KEY } from '../../common/constants';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../../process_instances/process_instance_steps/entities/process_instance_step.entity';
import { createEmptyNotificationContext } from './notification-context.types';
import { NotificationProcessContextLoader } from './notification-process-context.loader';
import { ProcessContextProvider } from './providers/process-context.provider';

describe('ProcessContextProvider', () => {
  let provider: ProcessContextProvider;
  let processLoader: jest.Mocked<NotificationProcessContextLoader>;

  beforeEach(async () => {
    processLoader = {
      loadProcessInstance: jest.fn(),
      loadStepInstance: jest.fn(),
    } as unknown as jest.Mocked<NotificationProcessContextLoader>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessContextProvider,
        { provide: NotificationProcessContextLoader, useValue: processLoader },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === NOTIFICATION_PUBLIC_BASE_URL_KEY) {
                return 'https://app.example.com';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get(ProcessContextProvider);
  });

  it('hydrates process fields from DB when requiredPaths reference process namespace', async () => {
    processLoader.loadStepInstance.mockResolvedValue({
      stepInstanceId: 456,
      processInstanceId: 42,
      name: 'Manager approval',
      stepOrder: 3,
      status: 'ready',
    } as ProcessInstanceStepEntity);
    processLoader.loadProcessInstance.mockResolvedValue({
      processInstanceId: 42,
      processTemplateId: 7,
      status: 'active',
    } as ProcessInstanceEntity);

    const context = createEmptyNotificationContext();
    await provider.apply(
      context,
      {
        eventName: 'six1-event.process_step_ready',
        occurredAt: null,
        correlationId: 'corr-1',
        causationId: null,
        tenantId: 5,
        actorUserId: 10,
        recipientUserId: 20,
        payload: { processInstanceId: 42, stepOrder: 3 },
        entityType: 'processstep',
        entityId: 456,
      },
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.process_step_ready',
            entity: { entityType: 'ProcessStep', entityId: 456 },
            data: { processInstanceId: 42, stepOrder: 3 },
          },
        },
        recipientUserId: 20,
      },
      { requiredPaths: ['process.stepName', 'urls.processRunner'] },
    );

    expect(context.process.instanceId).toBe(42);
    expect(context.process.stepInstanceId).toBe(456);
    expect(context.process.stepName).toBe('Manager approval');
    expect(context.process.templateId).toBe(7);
    expect(context.process.runnerUrl).toBe(
      'https://app.example.com/process-instances/42/runner',
    );
  });
});
