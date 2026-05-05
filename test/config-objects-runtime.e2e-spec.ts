import { Test, TestingModule } from '@nestjs/testing';
import { ConfigObjectsController } from '../src/config_objects/config_objects.controller';
import { ConfigObjectsService } from '../src/config_objects/config_objects.service';
import { ConfigLifecycleService } from '../src/config_objects/config_lifecycle.service';

describe('ConfigObjects Runtime Contracts (e2e)', () => {
  let controller: ConfigObjectsController;
  let configObjectsService: jest.Mocked<ConfigObjectsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigObjectsController],
      providers: [
        {
          provide: ConfigObjectsService,
          useValue: {
            getRuntimeManifest: jest.fn(),
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

    controller = module.get(ConfigObjectsController);
    configObjectsService = module.get(
      ConfigObjectsService,
    ) as jest.Mocked<ConfigObjectsService>;
  });

  it('runtime manifest contract should be consumable for each binding mode sample', async () => {
    const modes: Array<'system_table' | 'sor_bound' | 'standalone'> = [
      'system_table',
      'sor_bound',
      'standalone',
    ];
    for (const mode of modes) {
      configObjectsService.getRuntimeManifest.mockResolvedValueOnce({
        entityKey: mode === 'sor_bound' ? 'project' : mode,
        tenantId: 1,
        generatedAt: new Date().toISOString(),
        list: { viewType: 'list', config: { schemaVersion: 1 }, resolved: {} },
        detail: { viewType: 'detail', config: { schemaVersion: 1, panels: [] }, resolved: {} },
        form: { viewType: 'form', config: { schemaVersion: 1, panels: [] }, resolved: {} },
        diagnostics: [],
      } as any);

      const out = await controller.getRuntimeManifest({
        tenantId: 1,
        entityKey: mode === 'sor_bound' ? 'project' : mode,
      } as any);
      expect(out.list?.viewType).toBe('list');
      expect(out.detail?.viewType).toBe('detail');
      expect(out.form?.viewType).toBe('form');
    }
  });

  it('relation-heavy compose + action-validation runtime flow should be consumable', async () => {
    configObjectsService.composeRuntimeSubmitPayload.mockResolvedValueOnce({
      entityKey: 'role',
      tenantId: 1,
      operation: 'create',
      payload: {
        name: 'Admin',
        roleDescriptions: [{ languageId: 1, name: 'Administrator' }],
      },
    } as any);
    configObjectsService.validateRuntimeRelationAction.mockResolvedValueOnce({
      entityKey: 'role',
      tenantId: 1,
      relationKey: 'role_permissions',
      actionRef: 'six1:action:role.permissions.assign',
      allowed: true,
      requiredPermissions: ['roles.manage_permissions'],
      missingPermissions: [],
    } as any);

    const composed = await controller.composeRuntimeSubmitPayload({
      tenantId: 1,
      entityKey: 'role',
      operation: 'create',
      fieldValues: { name: 'Admin' },
      relationBlocks: {
        role_descriptions: [{ languageId: 1, name: 'Administrator' }],
      },
    } as any);
    const allowed = await controller.validateRuntimeRelationAction({
      tenantId: 1,
      entityKey: 'role',
      relationKey: 'role_permissions',
      actionRef: 'six1:action:role.permissions.assign',
      grantedPermissions: ['roles.manage_permissions'],
    } as any);

    expect((composed.payload as any).name).toBe('Admin');
    expect(allowed.allowed).toBe(true);
  });
});
