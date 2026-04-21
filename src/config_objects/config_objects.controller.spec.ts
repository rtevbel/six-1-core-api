import { Test, TestingModule } from '@nestjs/testing';
import { ConfigObjectsController } from './config_objects.controller';
import { ConfigObjectsService } from './config_objects.service';
import { ConfigLifecycleService } from './config_lifecycle.service';

describe('ConfigObjectsController', () => {
  let controller: ConfigObjectsController;
  let configObjectsService: jest.Mocked<ConfigObjectsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigObjectsController],
      providers: [
        {
          provide: ConfigObjectsService,
          useValue: {
            getObjectSchema: jest.fn(),
            getActiveScopedConfigView: jest.fn(),
            listActiveScopedConfigViews: jest.fn(),
            upsertScopedConfigView: jest.fn(),
            activateScopedConfigView: jest.fn(),
            deactivateScopedConfigView: jest.fn(),
          },
        },
        {
          provide: ConfigLifecycleService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ConfigObjectsController>(ConfigObjectsController);
    configObjectsService = module.get(
      ConfigObjectsService,
    ) as jest.Mocked<ConfigObjectsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getConfigSchema should delegate to service and preserve v0.1 contract path', async () => {
    const schema = {
      configObject: { configObjectId: 1 },
      fields: [],
    } as any;
    configObjectsService.getObjectSchema.mockResolvedValueOnce(schema);

    const result = await controller.getConfigSchema({
      tenantId: 10,
      objectType: 'project',
    } as any);

    expect(result).toEqual(schema);
    expect(configObjectsService.getObjectSchema).toHaveBeenCalledWith(
      10,
      'project',
    );
  });

  it('getActiveScopedConfigView should pass scope parameters to service', async () => {
    const view = { configObjectViewId: 111 } as any;
    configObjectsService.getActiveScopedConfigView.mockResolvedValueOnce(view);

    const result = await controller.getActiveScopedConfigView({
      tenantId: 20,
      entityKey: 'project',
      viewType: 'list',
    } as any);

    expect(result).toEqual(view);
    expect(configObjectsService.getActiveScopedConfigView).toHaveBeenCalledWith({
      tenantId: 20,
      entityKey: 'project',
      viewType: 'list',
    });
  });

  it('listActiveScopedConfigViews should pass tenant fallback input to service', async () => {
    const views = [{ configObjectViewId: 222 }] as any;
    configObjectsService.listActiveScopedConfigViews.mockResolvedValueOnce(views);

    const result = await controller.listActiveScopedConfigViews({
      entityKey: 'project',
    } as any);

    expect(result).toEqual(views);
    expect(configObjectsService.listActiveScopedConfigViews).toHaveBeenCalledWith({
      tenantId: null,
      entityKey: 'project',
    });
  });

  it('upsertScopedConfigView should delegate full DTO payload to service', async () => {
    const saved = { configObjectViewId: 333 } as any;
    configObjectsService.upsertScopedConfigView.mockResolvedValueOnce(saved);

    const result = await controller.upsertScopedConfigView(
      999,
      {
        tenantId: 30,
        entityKey: 'project',
        viewType: 'detail',
        updatedBy: 77,
        configObjectViewId: 44,
        viewKey: 'project_detail',
        name: 'Project detail',
        description: 'desc',
        roleKey: 'admin',
        isDefault: false,
        isActive: true,
        configJson: { detail: { sections: [] } },
      } as any,
    );

    expect(result).toEqual(saved);
    expect(configObjectsService.upsertScopedConfigView).toHaveBeenCalledWith({
      tenantId: 30,
      entityKey: 'project',
      viewType: 'detail',
      updatedBy: 77,
      configObjectViewId: 44,
      viewKey: 'project_detail',
      name: 'Project detail',
      description: 'desc',
      roleKey: 'admin',
      isDefault: false,
      isActive: true,
      configJson: { detail: { sections: [] } },
    });
  });

  it('activateScopedConfigView should delegate and return active view', async () => {
    const saved = { configObjectViewId: 444, isActive: true } as any;
    configObjectsService.activateScopedConfigView.mockResolvedValueOnce(saved);

    const result = await controller.activateScopedConfigView(
      999,
      {
        tenantId: 50,
        entityKey: 'project',
        viewType: 'list',
        configObjectViewId: 444,
        updatedBy: 88,
      } as any,
    );

    expect(result).toEqual(saved);
    expect(configObjectsService.activateScopedConfigView).toHaveBeenCalledWith({
      tenantId: 50,
      entityKey: 'project',
      viewType: 'list',
      configObjectViewId: 444,
      updatedBy: 88,
    });
  });

  it('deactivateScopedConfigView should delegate and return affected count', async () => {
    configObjectsService.deactivateScopedConfigView.mockResolvedValueOnce({
      deactivated: 2,
    });

    const result = await controller.deactivateScopedConfigView(
      999,
      {
        tenantId: 50,
        entityKey: 'project',
        viewType: 'list',
        updatedBy: 88,
      } as any,
    );

    expect(result).toEqual({ deactivated: 2 });
    expect(configObjectsService.deactivateScopedConfigView).toHaveBeenCalledWith({
      tenantId: 50,
      entityKey: 'project',
      viewType: 'list',
      configObjectViewId: undefined,
      updatedBy: 88,
    });
  });
});
