import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { DataSource, Repository } from 'typeorm';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectMetaEntity } from '../projects/entities/project_meta.entity';
import { ConfigObjectsService } from './config_objects.service';
import { ConfigTemplateSetEntity } from './entities/config_template_set.entity';
import { ConfigObjectEntity } from './entities/config_object.entity';
import { ConfigObjectFieldEntity } from './entities/config_object_field.entity';
import { ConfigObjectFieldRuleEntity } from './entities/config_object_field_rule.entity';
import { ConfigAuditLogEntity } from './entities/config_audit_log.entity';
import { ConfigObjectLifecycleEntity } from './entities/config_object_lifecycle.entity';
import { ConfigObjectRelationshipEntity } from './entities/config_object_relationship.entity';
import { ConfigObjectViewEntity } from './entities/config_object_view.entity';
import { ConfigObjectViewPanelEntity } from './entities/config_object_view_panel.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';
import { TaskMetaEntity } from '../projects/tasks/entities/task_meta.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { CustomerMetaEntity } from '../customers/entities/customer_meta.entity';
import { CustomerContactInfoEntity } from '../customers/customer_contact_info/entities/customer_contact_info.entity';
import { CustomerContactInfoMetaEntity } from '../customers/customer_contact_info/entities/customer_contact_info_meta.entity';
import { ResourceEntity } from '../scheduler/entities/resource.entity';
import { ResourceMetaEntity } from '../scheduler/entities/resource_meta.entity';
import { ConfigCustomObjectInstanceEntity } from './entities/config_custom_object_instance.entity';
import { ConfigObjectStatusMappingEntity } from './entities/config_object_status_mapping.entity';

describe('ConfigObjectsService', () => {
  let service: ConfigObjectsService;
  let dataSource: DataSource;

  let templateSetRepo: Repository<ConfigTemplateSetEntity>;
  let configObjectRepo: Repository<ConfigObjectEntity>;
  let fieldRepo: Repository<ConfigObjectFieldEntity>;
  let fieldRuleRepo: Repository<ConfigObjectFieldRuleEntity>;
  let lifecycleRepo: Repository<ConfigObjectLifecycleEntity>;
  let relationshipRepo: Repository<ConfigObjectRelationshipEntity>;
  let viewRepo: Repository<ConfigObjectViewEntity>;
  let auditLogRepo: Repository<ConfigAuditLogEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigObjectsService,
        {
          provide: getRepositoryToken(ConfigTemplateSetEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectFieldEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectFieldRuleEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectLifecycleEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectRelationshipEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectViewEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectViewPanelEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigAuditLogEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ProjectEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ProjectMetaEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TaskEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TaskMetaEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CustomerMetaEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CustomerContactInfoEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CustomerContactInfoMetaEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ResourceEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ResourceMetaEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigCustomObjectInstanceEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConfigObjectStatusMappingEntity),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConfigObjectsService>(ConfigObjectsService);
    dataSource = module.get<DataSource>(DataSource);

    templateSetRepo = module.get(getRepositoryToken(ConfigTemplateSetEntity));
    configObjectRepo = module.get(getRepositoryToken(ConfigObjectEntity));
    fieldRepo = module.get(getRepositoryToken(ConfigObjectFieldEntity));
    fieldRuleRepo = module.get(getRepositoryToken(ConfigObjectFieldRuleEntity));
    lifecycleRepo = module.get(getRepositoryToken(ConfigObjectLifecycleEntity));
    relationshipRepo = module.get(
      getRepositoryToken(ConfigObjectRelationshipEntity),
    );
    viewRepo = module.get(getRepositoryToken(ConfigObjectViewEntity));
    auditLogRepo = module.get(getRepositoryToken(ConfigAuditLogEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createCustomObjectInstance should reject sor_bound config objects', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
    } as any);

    await expect(
      service.createCustomObjectInstance({
        tenantId: 1,
        configObjectId: 10,
        createdBy: 99,
      }),
    ).rejects.toThrow(RpcException);
  });

  it('getObjectSchema should return null when no active template set exists', async () => {
    jest
      .spyOn(templateSetRepo, 'findOne')
      .mockResolvedValueOnce(null as any);

    const schema = await service.getObjectSchema(1, 'project');

    expect(schema).toBeNull();
  });

  it('getObjectSchema should return fields and rules when configuration exists', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 100,
      configTemplateSetId: 10,
      objectType: 'project',
      bindingMode: 'sor_bound',
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(fieldRepo, 'find').mockResolvedValueOnce([
      {
        configObjectFieldId: 1,
        fieldKey: 'project_type',
        orderIndex: 0,
        sectionKey: null,
        defaultValue: 'customer',
      } as any,
    ]);

    jest
      .spyOn(fieldRuleRepo, 'find')
      .mockResolvedValueOnce([{ configObjectFieldId: 1 } as any]);

    const schema = await service.getObjectSchema(1, 'project');

    expect(schema).not.toBeNull();
    expect(schema?.configObject.configObjectId).toBe(100);
    expect(schema?.fields.length).toBe(1);
    expect(schema?.fields[0].rules.length).toBe(1);
    expect(schema?.runnerKind).toBe('sor_bound');
    expect(schema?.supportsCustomFields).toBe(true);
    expect(schema?.resolveInstanceWith).toBe('coreId');
    expect(schema?.fieldSchemaSource).toBe('sor_plus_custom');
    expect(schema?.fieldMergePolicy.order).toBe('sor_first_then_custom');
    expect(schema?.sorFieldDescriptors.length).toBeGreaterThan(0);
    expect(schema?.mergedFieldOrder.some((e) => e.source === 'sor')).toBe(true);
    expect(schema?.mergedFieldOrder.some((e) => e.source === 'custom')).toBe(
      true,
    );
    // Keep v0.1_get_config_schema baseline stable and avoid leaking runtime-manifest keys.
    expect(schema).toHaveProperty('configObject');
    expect(schema).toHaveProperty('fields');
    expect(schema).not.toHaveProperty('list');
    expect(schema).not.toHaveProperty('detail');
    expect(schema).not.toHaveProperty('form');
    expect(schema).not.toHaveProperty('fieldRegistry');
  });

  it('getObjectSchema should include system_entity runner hints for system_table', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 200,
      configTemplateSetId: 10,
      objectType: 'tenant_teams',
      bindingMode: 'system_table',
      sorTableName: 'tenant_teams',
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(fieldRepo, 'find').mockResolvedValueOnce([]);

    const schema = await service.getObjectSchema(1, 'tenant_teams');

    expect(schema).not.toBeNull();
    expect(schema?.runnerKind).toBe('system_entity');
    expect(schema?.supportsCustomFields).toBe(false);
    expect(schema?.resolveInstanceWith).toBe('none');
    expect(schema?.fieldSchemaSource).toBe('external_dto');
    expect(schema?.sorFieldDescriptors).toEqual([]);
    expect(schema?.mergedFieldOrder).toEqual([]);
  });

  it('applySorBoundInstancePatch should merge core and meta in one transaction for project', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 100,
      configTemplateSetId: 10,
      objectType: 'project',
      bindingMode: 'sor_bound',
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(fieldRepo, 'find').mockResolvedValueOnce([
      {
        configObjectFieldId: 1,
        fieldKey: 'dyn1',
        orderIndex: 0,
        sectionKey: null,
      } as any,
    ]);
    jest.spyOn(fieldRuleRepo, 'find').mockResolvedValueOnce([]);

    const mockManager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          projectId: 5,
          tenantId: 1,
          name: 'Old',
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          projectId: 5,
          tenantId: 1,
          name: 'New',
        }),
      save: jest.fn(async (e) => e),
      create: jest.fn((_Entity: unknown, row: Record<string, unknown>) => ({
        ...row,
      })),
    };

    (dataSource.transaction as jest.Mock).mockImplementation(async (fn: unknown) =>
      (fn as (m: typeof mockManager) => Promise<unknown>)(mockManager),
    );

    const result = await service.applySorBoundInstancePatch({
      tenantId: 1,
      objectType: 'project',
      coreId: 5,
      corePatch: { name: 'New' },
      metaPatch: { dyn1: 'x' },
    });

    expect((result.core as { name: string }).name).toBe('New');
    expect(result.metaJson).toEqual({ dyn1: 'x' });
    expect(mockManager.save).toHaveBeenCalled();
  });

  it('getLifecyclesForObjectType should return lifecycles when configured', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 100,
      objectType: 'project',
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(lifecycleRepo, 'find').mockResolvedValueOnce([
      { stateKey: 'active' } as any,
      { stateKey: 'completed' } as any,
    ]);

    const lifecycles = await service.getLifecyclesForObjectType('project');

    expect(lifecycles).toHaveLength(2);
    expect(lifecycles[0].stateKey).toBe('active');
  });

  it('getRelationshipsForObjectType should return relationships when configured', async () => {
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([
      { relationshipKey: 'project_tasks' } as any,
    ]);

    const relationships =
      await service.getRelationshipsForObjectType('project');

    expect(relationships).toHaveLength(1);
    expect(relationships[0].relationshipKey).toBe('project_tasks');
  });

  it('createConfigRelationship defaults displayName to relationshipKey and queryConfig to {} when omitted', async () => {
    jest.spyOn(relationshipRepo, 'findOne').mockResolvedValueOnce(null);
    jest
      .spyOn(relationshipRepo, 'create')
      .mockImplementation((dto) => ({ ...dto, configObjectRelationshipId: 501 }) as any);
    jest.spyOn(relationshipRepo, 'save').mockImplementation(async (e) => e as any);
    jest
      .spyOn(auditLogRepo, 'create')
      .mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    const saved = await service.createConfigRelationship({
      tenantId: 1,
      fromObjectType: 'role',
      toObjectType: 'permission',
      relationshipKey: 'role_permission',
      cardinality: 'one_to_many',
      createdBy: 42,
      isActive: true,
    });

    expect(saved.displayName).toBe('role_permission');
    expect(saved.queryConfig).toEqual({});
    expect(relationshipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fromObjectType: 'role',
        toObjectType: 'permission',
        relationshipKey: 'role_permission',
        displayName: 'role_permission',
        queryConfig: {},
        cardinality: 'one_to_many',
        isActive: true,
      }),
    );
    expect(auditLogRepo.save).toHaveBeenCalled();
    const auditRow = (auditLogRepo.save as jest.Mock).mock.calls[0][0];
    expect(auditRow.newValue).toMatchObject({
      displayName: 'role_permission',
      queryConfig: {},
    });
  });

  it('createConfigRelationship keeps explicit displayName and queryConfig when provided', async () => {
    jest.spyOn(relationshipRepo, 'findOne').mockResolvedValueOnce(null);
    jest
      .spyOn(relationshipRepo, 'create')
      .mockImplementation((dto) => ({ ...dto, configObjectRelationshipId: 502 }) as any);
    jest.spyOn(relationshipRepo, 'save').mockImplementation(async (e) => e as any);
    jest
      .spyOn(auditLogRepo, 'create')
      .mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    const queryConfig = { filter: { status: 'active' } };
    const saved = await service.createConfigRelationship({
      tenantId: 1,
      fromObjectType: 'role',
      toObjectType: 'permission',
      relationshipKey: 'role_permission',
      displayName: 'Role permissions',
      cardinality: 'one_to_many',
      queryConfig,
      createdBy: 42,
    });

    expect(saved.displayName).toBe('Role permissions');
    expect(saved.queryConfig).toEqual(queryConfig);
    expect(relationshipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Role permissions',
        queryConfig,
      }),
    );
  });

  it('getViewsForObjectType should return views with panels when configured', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 100,
      objectType: 'project',
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(viewRepo, 'find').mockResolvedValueOnce([
      {
        viewKey: 'project_list_default',
        panels: [{ panelKey: 'project_summary' }],
      } as any,
    ]);

    const views = await service.getViewsForObjectType('project');

    expect(views).toHaveLength(1);
    expect(views[0].viewKey).toBe('project_list_default');
    expect(views[0].panels[0].panelKey).toBe('project_summary');
  });

  it('listConfigViews should resolve tenant-owned template sets when tenantId is omitted (global scope)', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 100,
      configTemplateSetId: 10,
      objectType: 'project',
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 42,
    } as any);

    jest.spyOn(viewRepo, 'find').mockResolvedValueOnce([
      { viewKey: 'project_list_default', panels: [] } as any,
    ]);

    const views = await service.listConfigViews(undefined, 'project');

    expect(views).toHaveLength(1);
    expect(templateSetRepo.findOne).toHaveBeenCalledWith({
      where: { configTemplateSetId: 10 },
    });
  });

  it('listConfigObjects should apply configTemplateSetId when passed as a string (global scope)', async () => {
    jest.spyOn(templateSetRepo, 'find').mockResolvedValueOnce([
      { configTemplateSetId: 1001 } as any,
    ]);
    jest.spyOn(configObjectRepo, 'find').mockResolvedValueOnce([]);

    await service.listConfigObjects(undefined, '1001' as unknown as number);

    expect(templateSetRepo.find).toHaveBeenCalledWith({
      where: { configTemplateSetId: 1001 },
      order: { configTemplateSetId: 'ASC' },
    });
  });

  it('listConfigObjects without template id queries all template sets (global scope)', async () => {
    jest.spyOn(templateSetRepo, 'find').mockResolvedValueOnce([
      { configTemplateSetId: 1 } as any,
      { configTemplateSetId: 2 } as any,
    ]);
    jest.spyOn(configObjectRepo, 'find').mockResolvedValueOnce([]);

    await service.listConfigObjects(undefined, undefined);

    expect(templateSetRepo.find).toHaveBeenCalledWith({
      where: {},
      order: { configTemplateSetId: 'ASC' },
    });
  });

  it('createConfigField should reject system_table binding_mode', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValue({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'system_table',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValue({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);

    await expect(
      service.createConfigField({
        tenantId: 1,
        configObjectId: 10,
        createdBy: 1,
        fieldKey: 'x',
        label: 'X',
        fieldType: 'text',
      }),
    ).rejects.toThrow(
      'Custom config fields are not supported when binding_mode is system_table.',
    );
  });

  it('listConfigFields should return empty array for system_table', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'system_table',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);

    const fields = await service.listConfigFields({
      tenantId: 1,
      configObjectId: 10,
    });

    expect(fields).toEqual([]);
  });

  it('getActiveScopedConfigView should fallback to global active view when tenant-scoped view does not exist', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 100,
      configTemplateSetId: 10,
      objectType: 'project',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
    } as any);

    const findOneSpy = jest
      .spyOn(viewRepo, 'findOne')
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({
        configObjectViewId: 200,
        tenantId: null,
        viewType: 'list',
        isActive: true,
      } as any);

    const result = await service.getActiveScopedConfigView({
      tenantId: 1,
      entityKey: 'project',
      viewType: 'list',
    });

    expect(result?.configObjectViewId).toBe(200);
    expect(findOneSpy).toHaveBeenCalledTimes(2);
  });

  it('listActiveScopedConfigViews should return global active views when tenant scope is omitted', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 101,
      configTemplateSetId: 10,
      objectType: 'project',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
    } as any);

    jest.spyOn(viewRepo, 'find').mockResolvedValueOnce([
      {
        configObjectViewId: 201,
        viewType: 'detail',
        tenantId: null,
        isActive: true,
      } as any,
    ]);

    const result = await service.listActiveScopedConfigViews({
      tenantId: undefined,
      entityKey: 'project',
    });

    expect(result).toHaveLength(1);
    expect(result[0].configObjectViewId).toBe(201);
  });

  it('upsertScopedConfigView should reject unknown field keys in configJson', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 102,
      configTemplateSetId: 10,
      objectType: 'project',
      bindingMode: 'sor_bound',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
    } as any);

    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce(null as any);
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: { configObjectId: 102 } as any,
      fields: [{ field: { fieldKey: 'knownField' } } as any],
    } as any);

    await expect(
      service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'list',
        updatedBy: 10,
        isActive: false,
        configJson: {
          list: {
            columns: ['unknownField'],
          },
        },
      }),
    ).rejects.toThrow('Scoped view config contains unknown field keys');
  });

  it('upsertScopedConfigView should skip field-key validation for system_table binding mode', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 104,
      configTemplateSetId: 10,
      objectType: 'tenant_teams',
      bindingMode: 'system_table',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
    } as any);

    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce(null as any);
    const createSpy = jest.spyOn(viewRepo, 'create').mockImplementation(
      (dto) =>
        ({
          configObjectViewId: 303,
          ...dto,
        }) as any,
    );
    jest.spyOn(viewRepo, 'save').mockImplementation(async (row) => row as any);
    jest.spyOn(auditLogRepo, 'create').mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    const result = await service.upsertScopedConfigView({
      tenantId: 1,
      entityKey: 'tenant_teams',
      viewType: 'list',
      updatedBy: 55,
      isActive: false,
      configJson: {
        list: { columns: ['external_openapi_field'] },
      },
    });

    expect(result.configObjectViewId).toBe(303);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        configObjectId: 104,
        viewType: 'list',
      }),
    );
  });

  it('activateScopedConfigView should enforce tenant scope match', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 103,
      configTemplateSetId: 10,
      objectType: 'project',
    } as any);

    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
    } as any);

    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce({
      configObjectViewId: 202,
      configObjectId: 103,
      tenantId: null,
      viewType: 'list',
    } as any);

    await expect(
      service.activateScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'list',
        configObjectViewId: 202,
        updatedBy: 99,
      }),
    ).rejects.toThrow('Scoped config view does not match the requested tenant scope.');
  });
});

