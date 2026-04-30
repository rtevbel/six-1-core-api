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
            getRuntimeManifest: jest.fn(),
            invalidateRuntimeCaches: jest.fn(),
            composeRuntimeSubmitPayload: jest.fn(),
            validateRuntimeRelationAction: jest.fn(),
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

  it('getRuntimeManifest should delegate to service and pass diagnostics flag', async () => {
    const manifest = {
      entityKey: 'project',
      tenantId: 77,
      generatedAt: '2026-01-01T00:00:00.000Z',
      list: null,
      detail: null,
      form: null,
      diagnostics: [],
    } as any;
    configObjectsService.getRuntimeManifest.mockResolvedValueOnce(manifest);

    const result = await controller.getRuntimeManifest({
      tenantId: 77,
      entityKey: 'project',
      includeDiagnostics: false,
    } as any);

    expect(result).toEqual(manifest);
    expect(configObjectsService.getRuntimeManifest).toHaveBeenCalledWith({
      tenantId: 77,
      entityKey: 'project',
      includeDiagnostics: false,
    });
  });

  it('invalidateRuntimeCache should delegate to service with cache-scope filters', async () => {
    configObjectsService.invalidateRuntimeCaches.mockResolvedValueOnce({
      ttlMs: 30000,
      cleared: { schema: 1, view: 2, manifest: 3 },
    } as any);

    const result = await controller.invalidateRuntimeCache(
      999,
      {
        tenantId: 77,
        entityKey: 'project',
        includeSchemaCache: true,
        includeViewCache: true,
        includeManifestCache: false,
      } as any,
    );

    expect(result).toEqual({
      ttlMs: 30000,
      cleared: { schema: 1, view: 2, manifest: 3 },
    });
    expect(configObjectsService.invalidateRuntimeCaches).toHaveBeenCalledWith({
      tenantId: 77,
      entityKey: 'project',
      includeSchemaCache: true,
      includeViewCache: true,
      includeManifestCache: false,
    });
  });

  it('composeRuntimeSubmitPayload should delegate operation payload composition', async () => {
    const composed = {
      entityKey: 'project',
      tenantId: 77,
      operation: 'create',
      payload: { name: 'My project', roleDescriptions: [{ languageId: 1, name: 'X' }] },
    } as any;
    configObjectsService.composeRuntimeSubmitPayload.mockResolvedValueOnce(composed);

    const result = await controller.composeRuntimeSubmitPayload({
      tenantId: 77,
      entityKey: 'project',
      operation: 'create',
      fieldValues: { name: 'My project' },
      relationBlocks: {
        role_descriptions: [{ languageId: 1, name: 'X' }],
      },
    } as any);

    expect(result).toEqual(composed);
    expect(configObjectsService.composeRuntimeSubmitPayload).toHaveBeenCalledWith({
      tenantId: 77,
      entityKey: 'project',
      operation: 'create',
      fieldValues: { name: 'My project' },
      relationBlocks: {
        role_descriptions: [{ languageId: 1, name: 'X' }],
      },
    });
  });

  it('validateRuntimeRelationAction should delegate relation action permission checks', async () => {
    configObjectsService.validateRuntimeRelationAction.mockResolvedValueOnce({
      entityKey: 'project',
      tenantId: 77,
      relationKey: 'project_roles',
      actionRef: 'six1:action:project.roles.assign',
      allowed: true,
      requiredPermissions: ['project.manage_roles'],
      missingPermissions: [],
    } as any);

    const result = await controller.validateRuntimeRelationAction({
      tenantId: 77,
      entityKey: 'project',
      relationKey: 'project_roles',
      actionRef: 'six1:action:project.roles.assign',
      grantedPermissions: ['project.manage_roles'],
    } as any);

    expect(result.allowed).toBe(true);
    expect(configObjectsService.validateRuntimeRelationAction).toHaveBeenCalledWith({
      tenantId: 77,
      entityKey: 'project',
      relationKey: 'project_roles',
      actionRef: 'six1:action:project.roles.assign',
      grantedPermissions: ['project.manage_roles'],
    });
  });
});
