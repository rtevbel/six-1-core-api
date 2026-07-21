import { Test, TestingModule } from '@nestjs/testing';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { EventsService } from '../../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA } from '../../events/seed/platform-event-payload-schema.util';
import { NOTIFICATION_NAMESPACE_MANIFEST } from '../context/notification-namespace.manifest';
import { NotificationVariableCatalogService } from './notification-variable-catalog.service';

describe('NotificationVariableCatalogService', () => {
  let service: NotificationVariableCatalogService;
  let configObjectsService: jest.Mocked<
    Pick<ConfigObjectsService, 'getObjectSchema'>
  >;
  let eventsService: jest.Mocked<Pick<EventsService, 'findOptionalByName'>>;

  beforeEach(async () => {
    configObjectsService = { getObjectSchema: jest.fn() };
    eventsService = { findOptionalByName: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationVariableCatalogService,
        { provide: ConfigObjectsService, useValue: configObjectsService },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get(NotificationVariableCatalogService);
  });

  it('merges builtin manifest and payload_schema variables from events table', async () => {
    configObjectsService.getObjectSchema.mockResolvedValue(null);
    eventsService.findOptionalByName.mockResolvedValue({
      eventId: 1,
      name: PLATFORM_EVENT_NAMES.PROJECT_CREATED,
      payloadSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'number' },
          projectName: { type: 'string' },
        },
      },
    } as any);

    const catalog = await service.buildCatalog({
      tenantId: 5,
      eventName: PLATFORM_EVENT_NAMES.PROJECT_CREATED,
    });

    expect(catalog.entries.length).toBeGreaterThan(
      NOTIFICATION_NAMESPACE_MANIFEST.length,
    );
    expect(
      catalog.entries.some((entry) => entry.path === 'payload.projectName'),
    ).toBe(true);
    expect(
      catalog.entries.some((entry) => entry.path === 'payload.projectId'),
    ).toBe(true);
    expect(catalog.entries.some((entry) => entry.path === 'projectName')).toBe(
      false,
    );
  });

  it('exposes P5 events from catalog seed payload_schema without EventVars', async () => {
    configObjectsService.getObjectSchema.mockResolvedValue(null);
    eventsService.findOptionalByName.mockResolvedValue(null);

    const catalog = await service.buildCatalog({
      tenantId: 5,
      eventName: PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
    });

    expect(
      catalog.entries.some((entry) => entry.path === 'payload.coreId'),
    ).toBe(true);
    expect(
      catalog.entries.some((entry) => entry.path === 'payload.changedFields'),
    ).toBe(true);
    expect(
      catalog.entries.some((entry) => entry.path === 'payload.resolutionMode'),
    ).toBe(true);
  });

  it('loads payload_schema from DB before seed fallback', async () => {
    configObjectsService.getObjectSchema.mockResolvedValue(null);
    eventsService.findOptionalByName.mockResolvedValue({
      eventId: 2,
      name: PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
      payloadSchema: SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA,
    } as any);

    const catalog = await service.buildCatalog({
      tenantId: 5,
      eventName: PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
    });

    expect(eventsService.findOptionalByName).toHaveBeenCalled();
    expect(
      catalog.entries.some((entry) => entry.path === 'payload.coreId'),
    ).toBe(true);
  });

  it('adds entity.fields.* from config object schema', async () => {
    configObjectsService.getObjectSchema.mockResolvedValue({
      fieldRegistry: [
        {
          fieldKey: 'companyName',
          label: 'Company name',
          fieldType: 'text',
          orderIndex: 1,
        },
      ],
    } as any);
    eventsService.findOptionalByName.mockResolvedValue(null);

    const catalog = await service.buildCatalog({
      tenantId: 5,
      objectType: 'customer',
    });

    expect(
      catalog.entries.some(
        (entry) => entry.path === 'entity.fields.companyName',
      ),
    ).toBe(true);
  });

  it('isKnownEventName returns true for schema-backed platform events', async () => {
    eventsService.findOptionalByName.mockResolvedValue(null);

    await expect(
      service.isKnownEventName(PLATFORM_EVENT_NAMES.SYSTEM_ENTITY_UPDATED),
    ).resolves.toBe(true);
  });

  it('builds catalog without tenantId for super-admin global scope', async () => {
    configObjectsService.getObjectSchema.mockResolvedValue(null);
    eventsService.findOptionalByName.mockResolvedValue(null);

    const catalog = await service.getCatalog({});

    expect(catalog.entries.length).toBe(NOTIFICATION_NAMESPACE_MANIFEST.length);
    expect(configObjectsService.getObjectSchema).not.toHaveBeenCalled();
  });

  it('resolves entity fields using global schema when tenantId is omitted', async () => {
    configObjectsService.getObjectSchema.mockResolvedValue({
      fieldRegistry: [
        {
          fieldKey: 'companyName',
          label: 'Company name',
          fieldType: 'text',
          orderIndex: 1,
        },
      ],
    } as any);
    eventsService.findOptionalByName.mockResolvedValue(null);

    await service.getCatalog({ objectType: 'customer' });

    expect(configObjectsService.getObjectSchema).toHaveBeenCalledWith(
      undefined,
      'customer',
    );
  });
});
