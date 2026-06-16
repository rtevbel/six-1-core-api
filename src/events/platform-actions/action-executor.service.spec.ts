import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ActionBindingEngineService,
  ActionExecutorService,
} from './action-executor.service';
import { ActionExecutionLogEntity } from './entities/action_execution_log.entity';
import { ActionBindingsService } from './action_bindings.service';
import { EventsService } from '../events.service';
import { EventCatalogService } from '../event-catalog.service';
import { PlatformEventFlagsService } from '../config/platform-event-flags.service';
import { NotificationRecipientResolverService } from '../notification-rules/notification-recipient-resolver.service';
import { NotificationTemplateEngineService } from '../../notifications/template-engine/notification-template-engine.service';
import { NotificationChannelsService } from '../../notifications/notification_channels/notification_channels.service';
import { NotificationTemplatesService } from '../../notifications/notification_templates/notification_templates.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationImmediateDispatchService } from '../../notifications/services/notification-immediate-dispatch.service';
import type { PlatformActionEntity } from './entities/platform_action.entity';
import type { ActionBindingEntity } from './entities/action_binding.entity';

describe('ActionExecutorService', () => {
  let executor: ActionExecutorService;
  let eventsService: jest.Mocked<Pick<EventsService, 'emitAsync'>>;
  let executionRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  const record = { recordId: 99 } as { recordId: number };
  const binding = { bindingId: 1 } as ActionBindingEntity;

  beforeEach(async () => {
    executionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((row) =>
        Promise.resolve({ executionId: 1, ...row }),
      ),
      create: jest.fn().mockImplementation((row) => row),
      update: jest.fn().mockResolvedValue(undefined),
    };

    eventsService = {
      emitAsync: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionExecutorService,
        {
          provide: getRepositoryToken(ActionExecutionLogEntity),
          useValue: executionRepo,
        },
        { provide: EventsService, useValue: eventsService },
        {
          provide: EventCatalogService,
          useValue: {
            getIdByName: jest.fn().mockResolvedValue(5),
            resolveCanonicalEventName: jest.fn((n: string) => n),
          },
        },
        {
          provide: NotificationRecipientResolverService,
          useValue: { resolve: jest.fn().mockResolvedValue([10]) },
        },
        {
          provide: NotificationTemplateEngineService,
          useValue: {
            renderFromEnvelope: jest.fn().mockResolvedValue({
              subject: 'Hi',
              message: 'Body',
              missingRequired: [],
            }),
          },
        },
        {
          provide: NotificationChannelsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ name: 'email' }),
          },
        },
        {
          provide: NotificationTemplatesService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              subject: '{{actor.name}}',
              message: 'Welcome',
            }),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({ notificationId: 42 }),
          },
        },
        {
          provide: NotificationImmediateDispatchService,
          useValue: { enqueueNotificationSend: jest.fn() },
        },
      ],
    }).compile();

    executor = module.get(ActionExecutorService);
  });

  it('emits child event with causationId from parent record', async () => {
    const action = {
      actionId: 7,
      actionType: 'emit_event',
      config: { eventName: 'six1-event.tenant.welcome' },
    } as PlatformActionEntity;

    const envelope = {
      eventName: 'six1-event.tenant.created',
      tenantId: 1,
      correlationId: 'corr-1',
      data: { tenantName: 'Acme' },
    };

    await executor.execute(binding, action, envelope, record as never);

    expect(eventsService.emitAsync).toHaveBeenCalledWith(
      'six1-event.tenant.welcome',
      expect.objectContaining({
        causationId: '99',
        correlationId: 'corr-1',
        tenantId: 1,
        data: { tenantName: 'Acme' },
      }),
    );
    expect(executionRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'succeeded' }),
    );
  });

  it('skips duplicate execution for same record and action', async () => {
    executionRepo.findOne.mockResolvedValue({ executionId: 2 });

    const action = {
      actionId: 7,
      actionType: 'emit_event',
      config: { eventName: 'six1-event.tenant.welcome' },
    } as PlatformActionEntity;

    await executor.execute(
      binding,
      action,
      { eventName: 'six1-event.tenant.created' },
      record as never,
    );

    expect(eventsService.emitAsync).not.toHaveBeenCalled();
  });
});

describe('ActionBindingEngineService', () => {
  it('no-ops when executor flag is disabled', async () => {
    const bindingsService = {
      findActiveBindingsForEvent: jest.fn(),
    };
    const executor = { execute: jest.fn() };
    const catalog = {
      resolveCanonicalEventName: jest.fn((n: string) => n),
    };
    const flags = { isActionExecutorEnabled: jest.fn().mockReturnValue(false) };

    const engine = new ActionBindingEngineService(
      bindingsService as never,
      executor as never,
      catalog as never,
      flags as never,
    );

    expect(
      engine.canHandle({ eventName: 'six1-event.tenant.created' }),
    ).toBe(false);
    await engine.process(
      { eventName: 'six1-event.tenant.created' },
      { recordId: 1 } as never,
    );
    expect(bindingsService.findActiveBindingsForEvent).not.toHaveBeenCalled();
  });
});
