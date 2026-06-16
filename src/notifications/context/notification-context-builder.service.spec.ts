import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../../users/users.service';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { NOTIFICATION_PUBLIC_BASE_URL_KEY } from '../../common/constants';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { NotificationContextBuilderService } from './notification-context-builder.service';
import { BuiltinNamespaceProvider } from './providers/builtin-namespace.provider';
import { ActorRecipientProvider } from './providers/actor-recipient.provider';
import { TenantContextProvider } from './providers/tenant-context.provider';
import { NotificationUrlsContextProvider } from './providers/notification-urls-context.provider';
import { ConfigObjectVariableProvider } from './providers/config-object-variable.provider';
import { ProcessContextProvider } from './providers/process-context.provider';
import { WorkflowContextProvider } from './providers/workflow-context.provider';
import { NotificationProcessContextLoader } from './notification-process-context.loader';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../../process_instances/process_instance_steps/entities/process_instance_step.entity';

describe('NotificationContextBuilderService', () => {
  let builder: NotificationContextBuilderService;
  let userService: jest.Mocked<Pick<UserService, 'findOne'>>;
  let tenantRepository: jest.Mocked<Pick<Repository<TenantEntity>, 'findOne'>>;
  let configObjectsService: jest.Mocked<
    Pick<ConfigObjectsService, 'resolveObjectInstance'>
  >;
  let processLoader: jest.Mocked<NotificationProcessContextLoader>;

  beforeEach(async () => {
    userService = { findOne: jest.fn() };
    tenantRepository = { findOne: jest.fn() };
    configObjectsService = { resolveObjectInstance: jest.fn() };
    processLoader = {
      loadProcessInstance: jest.fn(),
      loadStepInstance: jest.fn(),
    } as unknown as jest.Mocked<NotificationProcessContextLoader>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationContextBuilderService,
        BuiltinNamespaceProvider,
        ActorRecipientProvider,
        TenantContextProvider,
        NotificationUrlsContextProvider,
        ProcessContextProvider,
        WorkflowContextProvider,
        ConfigObjectVariableProvider,
        { provide: UserService, useValue: userService },
        { provide: ConfigObjectsService, useValue: configObjectsService },
        { provide: NotificationProcessContextLoader, useValue: processLoader },
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: tenantRepository,
        },
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

    builder = module.get(NotificationContextBuilderService);
  });

  it('builds context from a project-created envelope', async () => {
    userService.findOne.mockImplementation(async (_req, userId) => ({
      userId,
      email: userId === 10 ? 'actor@example.com' : 'recipient@example.com',
      firstName: userId === 10 ? 'Alice' : 'Bob',
      lastName: 'Smith',
      username: null,
      displayName: null,
    }));

    tenantRepository.findOne.mockResolvedValue({
      tenantId: 5,
      name: 'Acme Tenant',
    } as TenantEntity);

    const context = await builder.build({
      source: {
        kind: 'envelope',
        envelope: {
          eventName: 'six1-event.project_created',
          userId: 10,
          createdBy: 10,
          tenantId: 5,
          correlationId: 'corr-1',
          data: { projectId: 1001, projectName: 'Alpha' },
          entity: { entityType: 'project', entityId: 1001 },
        },
      },
      recipientUserId: 20,
    });

    expect(context.event.name).toBe('six1-event.project_created');
    expect(context.event.correlationId).toBe('corr-1');
    expect(context.payload).toEqual({
      projectId: 1001,
      projectName: 'Alpha',
    });
    expect(context.payload.projectId).toBe(1001);
    expect(context.actor.id).toBe(10);
    expect(context.actor.email).toBe('actor@example.com');
    expect(context.recipient.id).toBe(20);
    expect(context.recipient.email).toBe('recipient@example.com');
    expect(context.tenant.id).toBe(5);
    expect(context.tenant.name).toBe('Acme Tenant');
    expect(context.urls.project).toBe('https://app.example.com/projects/1001');
  });

  it('builds context from an event log without flat payload merge at root', async () => {
    userService.findOne.mockResolvedValue({
      userId: 20,
      email: 'recipient@example.com',
      firstName: 'Bob',
      lastName: null,
      username: null,
      displayName: null,
    });

    const context = await builder.build({
      source: {
        kind: 'event_log',
        eventLog: {
          eventId: 1,
          userId: 20,
          createdBy: 10,
          entityId: 1001,
          entityType: 'project',
          payload: {
            projectId: 1001,
            tenantId: 5,
            correlationId: 'corr-log',
          },
          event: { name: 'project_created' },
        } as any,
      },
      recipientUserId: 20,
      tenantId: 5,
    });

    expect(context.event.name).toBe('project_created');
    expect(context.payload.projectId).toBe(1001);
    expect(context.recipient.email).toBe('recipient@example.com');
    expect(context.urls.project).toBe('https://app.example.com/projects/1001');
  });

  it('hydrates entity.fields when requiredPaths reference entity fields', async () => {
    userService.findOne.mockResolvedValue({
      userId: 20,
      email: 'recipient@example.com',
      firstName: 'Bob',
      lastName: null,
      username: null,
      displayName: null,
    });
    tenantRepository.findOne.mockResolvedValue({
      tenantId: 5,
      name: 'Acme Tenant',
    } as TenantEntity);
    configObjectsService.resolveObjectInstance.mockResolvedValue({
      resolutionMode: 'sor_bound',
      objectType: 'project',
      coreId: 1001,
      tenantId: 5,
      schema: {
        fieldRegistry: [
          {
            fieldKey: 'name',
            label: 'Name',
            fieldType: 'text',
            orderIndex: 1,
          },
        ],
        mergedFieldOrder: [{ source: 'sor', fieldKey: 'name' }],
      },
      core: { projectId: 1001, name: 'Alpha' },
      dynamicFields: {},
      sections: [],
    } as any);

    const context = await builder.build(
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.project_created',
            tenantId: 5,
            entity: { entityType: 'project', entityId: 1001 },
            data: { projectId: 1001 },
          },
        },
        recipientUserId: 20,
      },
      { requiredPaths: ['entity.fields.name'] },
    );

    expect(context.entity.fields.name).toBe('Alpha');
    expect(context.entity.displayLabel).toBe('Alpha');
    expect(configObjectsService.resolveObjectInstance).toHaveBeenCalledWith(
      5,
      'project',
      1001,
      undefined,
    );
  });

  it('hydrates process step context for process_step_ready envelopes', async () => {
    userService.findOne.mockResolvedValue({
      userId: 20,
      email: 'recipient@example.com',
      firstName: 'Bob',
      lastName: null,
      username: null,
      displayName: null,
    });
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

    const context = await builder.build(
      {
        source: {
          kind: 'envelope',
          envelope: {
            eventName: 'six1-event.process_step_ready',
            tenantId: 5,
            correlationId: 'corr-step',
            entity: { entityType: 'ProcessStep', entityId: 456 },
            data: { processInstanceId: 42, stepOrder: 3 },
          },
        },
        recipientUserId: 20,
      },
      { requiredPaths: ['process.stepName', 'urls.processRunner'] },
    );

    expect(context.process.stepName).toBe('Manager approval');
    expect(context.process.instanceId).toBe(42);
    expect(context.urls.processRunner).toBe(
      'https://app.example.com/process-instances/42/runner',
    );
    expect(context.process.runnerUrl).toBe(
      'https://app.example.com/process-instances/42/runner',
    );
  });
});
