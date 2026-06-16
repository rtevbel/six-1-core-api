import { Test, TestingModule } from '@nestjs/testing';
import { NotificationContextBuilderService } from '../context/notification-context-builder.service';
import { createEmptyNotificationContext } from '../context/notification-context.types';
import { NotificationVariableResolverService } from '../services/notification-variable-resolver.service';
import { NotificationTemplateEngineService } from './notification-template-engine.service';

describe('NotificationTemplateEngineService', () => {
  let engine: NotificationTemplateEngineService;
  let contextBuilder: jest.Mocked<
    Pick<NotificationContextBuilderService, 'build'>
  >;
  let variableResolver: jest.Mocked<
    Pick<NotificationVariableResolverService, 'resolve'>
  >;

  beforeEach(async () => {
    contextBuilder = { build: jest.fn() };
    variableResolver = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateEngineService,
        {
          provide: NotificationContextBuilderService,
          useValue: contextBuilder,
        },
        {
          provide: NotificationVariableResolverService,
          useValue: variableResolver,
        },
      ],
    }).compile();

    engine = module.get(NotificationTemplateEngineService);
  });

  it('renders conditionals and helpers from a built context', () => {
    const context = createEmptyNotificationContext();
    context.recipient.name = 'Bob';
    context.process.stepName = 'Manager approval';
    context.entity.fields.dueDate = '2026-06-04T12:00:00.000Z';

    const result = engine.render(
      'task_assigned',
      'Task update',
      '{{#if process.stepName}}Step {{process.stepName}}{{/if}} due {{formatDate entity.fields.dueDate "short"}}',
      context,
    );

    expect(result.message).toContain('Step Manager approval');
    expect(result.message).toMatch(/due\s+\d/);
    expect(result.missingRequired).toEqual([]);
  });

  it('applies legacy flat aliases from context namespaces', () => {
    const context = createEmptyNotificationContext();
    context.entity.fields.name = 'Alpha Project';

    const result = engine.render(
      'project_created',
      null,
      'Project {{projectName}} created',
      context,
    );

    expect(result.message).toBe('Project Alpha Project created');
  });

  it('hydrates context lazily when rendering from an event log', async () => {
    const context = createEmptyNotificationContext();
    context.recipient.email = 'bob@example.com';
    contextBuilder.build.mockResolvedValue(context);
    variableResolver.resolve.mockResolvedValue({ projectName: 'Legacy Name' });

    const eventLog = {
      logId: 1,
      eventId: 2,
      userId: 20,
      createdBy: 10,
      payload: { tenantId: 5, projectId: 1001 },
      event: { name: 'project_created' },
    } as any;

    const result = await engine.renderFromEventLog(
      eventLog,
      'Hello',
      'Email: {{recipient.email}}',
    );

    expect(contextBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 20 }),
      expect.objectContaining({
        requiredPaths: expect.arrayContaining(['recipient.email']),
      }),
    );
    expect(result.message).toBe('Email: bob@example.com');
  });
});
