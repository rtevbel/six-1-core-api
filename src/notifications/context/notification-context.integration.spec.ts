import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import type { EventEmitOptions } from '../../events/interfaces/event-emit-options.interface';
import type { EventEnvelope } from '../../events/types';
import {
  PLATFORM_SOR_OBJECT_TYPES,
  buildSorBoundDomainEventOptions,
} from '../../events/platform-domain-event.util';
import { buildProcessStepEventOptions } from '../../events/platform-process-event.util';
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

function envelopeFromEmitOptions(
  eventName: string,
  options: EventEmitOptions,
): EventEnvelope {
  return {
    eventName,
    tenantId: options.tenantId,
    userId: options.userId,
    createdBy: options.createdBy,
    correlationId: options.correlationId,
    entity: options.entity,
    refs: options.refs,
    data: options.data,
  };
}

/**
 * NV1.6 — Integration-style coverage for the notification context provider stack.
 * Real NV1–NV3 providers are wired together; external I/O is mocked. No dispatch/job wiring.
 */
describe('Notification context integration (NV1.6)', () => {
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

  describe('project_created (NV1 + NV2.5 envelope)', () => {
    beforeEach(() => {
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
    });

    it('builds event, recipient, payload, tenant, and urls from a sor_bound producer envelope', async () => {
      const emitOptions = buildSorBoundDomainEventOptions({
        objectType: PLATFORM_SOR_OBJECT_TYPES.PROJECT,
        coreId: 1001,
        tenantId: 5,
        actorUserId: 10,
        correlationId: 'corr-nv16',
        data: { projectId: 1001, name: 'Alpha' },
      });

      const context = await builder.build({
        source: {
          kind: 'envelope',
          envelope: envelopeFromEmitOptions(
            PLATFORM_EVENT_NAMES.PROJECT_CREATED,
            emitOptions,
          ),
        },
        recipientUserId: 20,
      });

      expect(context.event.name).toBe(PLATFORM_EVENT_NAMES.PROJECT_CREATED);
      expect(context.event.correlationId).toBe('corr-nv16');
      expect(context.recipient.email).toBe('recipient@example.com');
      expect(context.payload.projectId).toBe(1001);
      expect(context.payload.name).toBe('Alpha');
      expect(context.payload.coreId).toBe(1001);
      expect(context.payload.resolutionMode).toBe('sor_bound');
      expect(context.actor.email).toBe('actor@example.com');
      expect(context.tenant.id).toBe(5);
      expect(context.tenant.name).toBe('Acme Tenant');
      expect(context.urls.project).toBe('https://app.example.com/projects/1001');
      expect(configObjectsService.resolveObjectInstance).not.toHaveBeenCalled();
    });

    it('hydrates entity.fields when NV2 lazy paths are required', async () => {
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

      const emitOptions = buildSorBoundDomainEventOptions({
        objectType: PLATFORM_SOR_OBJECT_TYPES.PROJECT,
        coreId: 1001,
        tenantId: 5,
        actorUserId: 10,
        data: { projectId: 1001 },
      });

      const context = await builder.build(
        {
          source: {
            kind: 'envelope',
            envelope: envelopeFromEmitOptions(
              PLATFORM_EVENT_NAMES.PROJECT_CREATED,
              emitOptions,
            ),
          },
          recipientUserId: 20,
        },
        { requiredPaths: ['entity.fields.name', 'recipient.email'] },
      );

      expect(context.entity.objectType).toBe('project');
      expect(context.entity.resolutionMode).toBe('sor_bound');
      expect(context.entity.coreId).toBe(1001);
      expect(context.entity.fields.name).toBe('Alpha');
      expect(context.entity.displayLabel).toBe('Alpha');
      expect(context.recipient.email).toBe('recipient@example.com');
      expect(configObjectsService.resolveObjectInstance).toHaveBeenCalledWith(
        5,
        'project',
        1001,
        undefined,
      );
    });
  });

  describe('process_step_ready (NV3 process namespace)', () => {
    beforeEach(() => {
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
    });

    it('builds process context and runner URL from a system_table producer envelope', async () => {
      const emitOptions = buildProcessStepEventOptions({
        tenantId: 5,
        stepInstanceId: 456,
        processInstanceId: 42,
        stepOrder: 3,
        stepName: 'Manager approval',
        processTemplateId: 7,
        correlationId: 'corr-step-nv16',
        actorTenantUserId: 10,
      });

      const context = await builder.build(
        {
          source: {
            kind: 'envelope',
            envelope: envelopeFromEmitOptions(
              PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
              emitOptions,
            ),
          },
          recipientUserId: 20,
          refs: emitOptions.refs,
        },
        { requiredPaths: ['process.stepName', 'urls.processRunner'] },
      );

      expect(context.event.name).toBe(PLATFORM_EVENT_NAMES.PROCESS_STEP_READY);
      expect(context.recipient.email).toBe('recipient@example.com');
      expect(context.process.stepName).toBe('Manager approval');
      expect(context.process.instanceId).toBe(42);
      expect(context.process.stepInstanceId).toBe(456);
      expect(context.process.templateId).toBe(7);
      expect(context.urls.processRunner).toBe(
        'https://app.example.com/process-instances/42/runner',
      );
      expect(context.process.runnerUrl).toBe(
        'https://app.example.com/process-instances/42/runner',
      );
      expect(configObjectsService.resolveObjectInstance).not.toHaveBeenCalled();
    });
  });
});
