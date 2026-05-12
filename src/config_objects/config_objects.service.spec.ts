import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { AuthoringErrorCode } from './constants/authoring-error-codes';
import { RuntimeErrorCode } from './constants/runtime-error-codes';
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
  let panelRepo: Repository<ConfigObjectViewPanelEntity>;
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
    panelRepo = module.get(getRepositoryToken(ConfigObjectViewPanelEntity));
    auditLogRepo = module.get(getRepositoryToken(ConfigAuditLogEntity));

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValue(null as any);
    jest.spyOn(fieldRepo, 'find').mockResolvedValue([]);
    jest.spyOn(fieldRuleRepo, 'find').mockResolvedValue([]);
    jest.spyOn(relationshipRepo, 'find').mockResolvedValue([]);
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
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(null as any);

    const schema = await service.getObjectSchema(1, 'project');

    expect(schema).toBeNull();
  });

  it('getObjectSchema should fallback to global published template set when tenant has none', async () => {
    jest
      .spyOn(templateSetRepo, 'findOne')
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({
        configTemplateSetId: 20,
        tenantId: null,
        status: 'PUBLISHED',
      } as any);

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 120,
      configTemplateSetId: 20,
      objectType: 'customer',
      bindingMode: 'sor_bound',
      status: 'PUBLISHED',
    } as any);
    jest.spyOn(fieldRepo, 'find').mockResolvedValueOnce([]);
    jest.spyOn(fieldRuleRepo, 'find').mockResolvedValueOnce([]);
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([]);

    const schema = await service.getObjectSchema(17, 'customer');

    expect(schema).not.toBeNull();
    expect(schema?.configObject.objectType).toBe('customer');
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
        label: 'Project Type',
        fieldType: 'text',
        orderIndex: 0,
        sectionKey: null,
        defaultValue: 'customer',
        validationJson: {
          _six1LookupSelectAuthoring: {
            schemaVersion: 1,
            dataRef: 'core.system_statuses.list',
            valueKey: 'statusId',
            labelKey: 'name',
          },
          _six1DerivedRuntimeAuthoring: {
            schemaVersion: 1,
            operation: 'concat',
            sourceFieldKeys: ['groupName', 'name'],
            separator: ' - ',
          },
        },
      } as any,
    ]);

    jest
      .spyOn(fieldRuleRepo, 'find')
      .mockResolvedValueOnce([{ configObjectFieldId: 1 } as any]);
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([]);

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
    expect(schema?.fieldRegistry.some((field) => field.fieldKey === 'projectId')).toBe(
      true,
    );
    expect(
      schema?.fieldRegistry.some((field) => field.fieldKey === 'project_type'),
    ).toBe(true);
    const projectType = schema?.fieldRegistry.find(
      (field) => field.fieldKey === 'project_type',
    );
    expect(projectType?.lookupSelectConfig?.dataRef).toBe(
      'core.system_statuses.list',
    );
    expect(projectType?.derivedRuntimeConfig?.operation).toBe('concat');
    // Keep v0.1_get_config_schema baseline stable and avoid leaking runtime-manifest keys.
    expect(schema).toHaveProperty('configObject');
    expect(schema).toHaveProperty('fields');
    expect(schema).not.toHaveProperty('list');
    expect(schema).not.toHaveProperty('detail');
    expect(schema).not.toHaveProperty('form');
    expect(schema).toHaveProperty('fieldRegistry');
    expect(Array.isArray(schema?.relations)).toBe(true);
    expect(schema?.relations?.some((r) => r.relationshipKey === 'project_tasks')).toBe(
      true,
    );
    expect(schema?.relatedFieldRegistryByRelationKey).toBeDefined();
    expect(schema?.relationManifestsByKey).toBeDefined();
  });

  it('getObjectSchema should resolve legacy plural objectType rows for canonical requests', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 101,
      configTemplateSetId: 10,
      objectType: 'customers',
      bindingMode: 'sor_bound',
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(fieldRepo, 'find').mockResolvedValueOnce([]);
    jest.spyOn(fieldRuleRepo, 'find').mockResolvedValueOnce([]);
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([]);

    const schema = await service.getObjectSchema(1, 'customer');

    expect(schema).not.toBeNull();
    expect(schema?.configObject.objectType).toBe('customers');
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
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([]);

    const schema = await service.getObjectSchema(1, 'tenant_teams');

    expect(schema).not.toBeNull();
    expect(schema?.runnerKind).toBe('system_entity');
    expect(schema?.supportsCustomFields).toBe(false);
    expect(schema?.resolveInstanceWith).toBe('none');
    expect(schema?.fieldSchemaSource).toBe('external_dto');
    expect(schema?.fieldRegistry.length).toBeGreaterThan(0);
    expect(schema?.fieldRegistry.some((field) => field.fieldKey === 'tenantTeamId')).toBe(
      true,
    );
    expect(schema?.sorFieldDescriptors).toEqual([]);
    expect(schema?.mergedFieldOrder).toEqual([]);
    expect(schema?.relations?.some((rel) => rel.relationshipKey === 'tenant_teams_projects')).toBe(
      true,
    );
  });

  it('getObjectSchema should include merged relation catalogs and related field registries', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);

    jest.spyOn(configObjectRepo, 'findOne').mockImplementation(async (opts: any) => {
      const w = opts?.where ?? {};
      const candidateObjectTypes: string[] = Array.isArray(w.objectType?.value)
        ? w.objectType.value
        : typeof w.objectType === 'string'
          ? [w.objectType]
          : [];
      if (candidateObjectTypes.includes('role')) {
        return {
          configObjectId: 301,
          configTemplateSetId: 10,
          objectType: 'role',
          bindingMode: 'system_table',
          status: 'PUBLISHED',
        } as any;
      }
      if (candidateObjectTypes.includes('permissions')) {
        return {
          configObjectId: 302,
          configTemplateSetId: 10,
          objectType: 'permissions',
          bindingMode: 'system_table',
          status: 'PUBLISHED',
        } as any;
      }
      if (candidateObjectTypes.includes('role_descriptions')) {
        return {
          configObjectId: 303,
          configTemplateSetId: 10,
          objectType: 'role_descriptions',
          bindingMode: 'system_table',
          status: 'PUBLISHED',
        } as any;
      }
      return null as any;
    });

    jest.spyOn(fieldRepo, 'find').mockResolvedValue([]);
    jest.spyOn(fieldRuleRepo, 'find').mockResolvedValue([]);
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([
      {
        fromObjectType: 'role',
        toObjectType: 'custom_checklist',
        relationshipKey: 'role_custom_checklist',
        displayName: 'Role custom checklist',
        cardinality: 'one_to_many',
        relationshipSource: 'designer',
        isActive: true,
        queryConfig: {},
        relationManifestJson: { actionRef: 'assignChecklist' },
      } as any,
    ]);

    const schema = await service.getObjectSchema(1, 'role');

    expect(schema?.relations?.some((r) => r.relationshipKey === 'role_permissions')).toBe(true);
    expect(schema?.relations?.some((r) => r.relationshipKey === 'role_descriptions')).toBe(true);
    expect(schema?.relations?.some((r) => r.relationshipKey === 'role_custom_checklist')).toBe(true);
    expect(
      schema?.relatedFieldRegistryByRelationKey?.role_permissions?.some(
        (f) => f.fieldKey === 'permission_id',
      ),
    ).toBe(true);
    expect(
      (
        schema?.relatedFieldRegistryByRelationKey?.role_tenant_user_invitations ??
        []
      ).length,
    ).toBeGreaterThan(0);
    expect(
      schema?.relatedFieldRegistrySourceByRelationKey?.role_permissions,
    ).toBe('configured_object');
    expect(
      schema?.relatedFieldRegistrySourceByRelationKey?.role_tenant_user_invitations,
    ).toBe('entity_fallback');
    expect(schema?.fieldRegistry.some((f) => f.fieldKey === 'roleId')).toBe(true);
    expect(schema?.relationManifestsByKey?.role_custom_checklist).toEqual({
      actionRef: 'assignChecklist',
    });
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
        label: 'Dyn 1',
        fieldType: 'text',
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

  it('getRelationshipsForObjectType should return merged orm+designer relationships', async () => {
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([
      {
        fromObjectType: 'project',
        toObjectType: 'custom_checklist',
        relationshipKey: 'project_custom_checklist',
        displayName: 'Project custom checklist',
        cardinality: 'one_to_many',
        relationshipSource: 'designer',
        isActive: true,
        queryConfig: {},
      } as any,
    ]);

    const relationships = await service.getRelationshipsForObjectType('project');

    expect(
      relationships.some((r) => r.relationshipKey === 'project_custom_checklist'),
    ).toBe(true);
    expect(
      relationships.some(
        (r) => r.relationshipSource === 'orm' && r.fromObjectType === 'project',
      ),
    ).toBe(true);
  });

  it('createConfigRelationship defaults displayName to relationshipKey and queryConfig to {} when omitted', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);
    jest
      .spyOn(configObjectRepo, 'findOne')
      .mockResolvedValueOnce({
        configTemplateSetId: 10,
        objectType: 'role',
        status: 'PUBLISHED',
      } as any)
      .mockResolvedValueOnce({
        configTemplateSetId: 10,
        objectType: 'permission',
        status: 'PUBLISHED',
      } as any);
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
        relationshipSource: 'designer',
        displayName: 'role_permission',
        queryConfig: {},
        relationManifestJson: null,
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
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);
    jest
      .spyOn(configObjectRepo, 'findOne')
      .mockResolvedValueOnce({
        configTemplateSetId: 10,
        objectType: 'role',
        status: 'PUBLISHED',
      } as any)
      .mockResolvedValueOnce({
        configTemplateSetId: 10,
        objectType: 'permission',
        status: 'PUBLISHED',
      } as any);
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
        relationshipSource: 'designer',
        relationManifestJson: null,
      }),
    );
  });

  it('createConfigRelationship should reject unpublished toObjectType (B-4)', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
      status: 'PUBLISHED',
    } as any);
    jest
      .spyOn(configObjectRepo, 'findOne')
      .mockResolvedValueOnce({
        configTemplateSetId: 10,
        objectType: 'role',
        status: 'PUBLISHED',
      } as any)
      .mockResolvedValueOnce(null as any);
    jest.spyOn(relationshipRepo, 'findOne').mockResolvedValueOnce(null);

    try {
      await service.createConfigRelationship({
        tenantId: 1,
        fromObjectType: 'role',
        toObjectType: 'ghost_type',
        relationshipKey: 'r1',
        cardinality: 'one_to_many',
        createdBy: 1,
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        code: AuthoringErrorCode.RelationPublishedEndpoints,
      });
    }
  });

  it('updateConfigRelationship should reject relationship outside tenant scope', async () => {
    jest.spyOn(relationshipRepo, 'findOne').mockResolvedValueOnce({
      configObjectRelationshipId: 77,
      fromObjectType: 'role',
      toObjectType: 'permission',
      relationshipKey: 'role_permission',
      displayName: 'Role permission',
      cardinality: 'one_to_many',
      queryConfig: {},
      isActive: true,
      relationshipSource: 'designer',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce(null as any);

    await expect(
      service.updateConfigRelationship({
        tenantId: 1,
        configObjectRelationshipId: 77,
        updatedBy: 10,
        displayName: 'x',
      }),
    ).rejects.toThrow('No active published template set found');
  });

  it('deleteConfigRelationship should reject relationship outside tenant scope', async () => {
    jest.spyOn(relationshipRepo, 'findOne').mockResolvedValueOnce({
      configObjectRelationshipId: 78,
      fromObjectType: 'role',
      toObjectType: 'permission',
      relationshipKey: 'role_permission',
      displayName: 'Role permission',
      cardinality: 'one_to_many',
      queryConfig: {},
      isActive: true,
      relationshipSource: 'designer',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce(null as any);

    await expect(
      service.deleteConfigRelationship({
        tenantId: 1,
        configObjectRelationshipId: 78,
        deletedBy: 10,
      }),
    ).rejects.toThrow('No active published template set found');
  });

  it('getRelatedFieldCatalogForRelationship should return field keys from target schema', async () => {
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([
      {
      fromObjectType: 'role',
      relationshipKey: 'role_perms',
      toObjectType: 'permission',
      cardinality: 'many_to_many',
      relationshipSource: 'designer',
      isActive: true,
      queryConfig: {},
    } as any,
    ]);
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      fields: [
        { field: { fieldKey: 'name' } },
        { field: { fieldKey: 'code' } },
      ],
    } as any);

    const out = await service.getRelatedFieldCatalogForRelationship({
      tenantId: 1,
      fromObjectType: 'role',
      relationshipKey: 'role_perms',
    });

    expect(out.toObjectType).toBe('permission');
    expect(out.fieldKeys).toEqual(['name', 'code']);
    expect(out.relationshipSource).toBe('designer');
  });

  it('getRelationshipsForObjectType should reject duplicate orm and designer relation keys', async () => {
    jest.spyOn(relationshipRepo, 'find').mockResolvedValueOnce([
      {
        fromObjectType: 'role',
        toObjectType: 'permission',
        relationshipKey: 'role_permissions',
        displayName: 'Role permissions',
        cardinality: 'many_to_many',
        relationshipSource: 'designer',
        isActive: true,
        queryConfig: {},
      } as any,
    ]);

    await expect(service.getRelationshipsForObjectType('role')).rejects.toThrow(
      /Duplicate relationship key/,
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

  it('createConfigObject should canonicalize objectType to singular form', async () => {
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
    } as any);
    jest.spyOn(configObjectRepo, 'find').mockResolvedValueOnce([]);
    jest.spyOn(configObjectRepo, 'create').mockImplementation((dto) => dto as any);
    jest.spyOn(configObjectRepo, 'save').mockImplementation(async (row: any) => ({
      configObjectId: 901,
      ...row,
    }));
    jest.spyOn(auditLogRepo, 'create').mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    const out = await service.createConfigObject({
      tenantId: 1,
      configTemplateSetId: 10,
      createdBy: 7,
      objectType: 'categories',
      bindingMode: 'system_table',
      sorTableName: 'categories',
      displayName: 'Categories',
    });

    expect(out.objectType).toBe('category');
    expect(configObjectRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ objectType: 'category' }),
    );
  });

  it('updateConfigObject should canonicalize incoming objectType to singular form', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 902,
      configTemplateSetId: 10,
      objectType: 'categories',
      bindingMode: 'system_table',
      sorTableName: 'categories',
      displayName: 'Categories',
      description: null,
      status: 'PUBLISHED',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 10,
      tenantId: 1,
    } as any);
    jest.spyOn(configObjectRepo, 'find').mockResolvedValueOnce([
      { configObjectId: 902, objectType: 'categories' } as any,
    ]);
    jest.spyOn(configObjectRepo, 'save').mockImplementation(async (row: any) => row);
    jest.spyOn(auditLogRepo, 'create').mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    const out = await service.updateConfigObject({
      tenantId: 1,
      configObjectId: 902,
      updatedBy: 8,
      objectType: 'projects',
    });

    expect(out.objectType).toBe('project');
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

  it('createConfigField normalizes field_key (trim, lowercase, spaces to underscores)', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValue({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValue({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);
    jest.spyOn(fieldRepo, 'findOne').mockResolvedValue(null as any);
    const createSpy = jest
      .spyOn(fieldRepo, 'create')
      .mockImplementation((row) => ({ ...row, configObjectFieldId: 99 }) as any);
    jest.spyOn(fieldRepo, 'save').mockImplementation(async (e) => e as any);
    jest.spyOn(auditLogRepo, 'create').mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    await service.createConfigField({
      tenantId: 1,
      configObjectId: 10,
      createdBy: 1,
      fieldKey: '  My Custom Field ',
      label: 'My Custom Field',
      fieldType: 'text',
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ fieldKey: 'my_custom_field' }),
    );
  });

  it('createConfigField rejects field_key that is not a valid identifier after normalization', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValue({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
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
        fieldKey: 'bad-key',
        label: 'Bad',
        fieldType: 'text',
      }),
    ).rejects.toThrow(RpcException);
  });

  it('createConfigField should reject invalid lookup-select authoring metadata', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValue({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValue({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);
    jest.spyOn(fieldRepo, 'findOne').mockResolvedValue(null as any);

    try {
      await service.createConfigField({
        tenantId: 1,
        configObjectId: 10,
        createdBy: 1,
        fieldKey: 'statusId',
        label: 'Status',
        fieldType: 'number',
        validationJson: {
          _six1LookupSelectAuthoring: {
            schemaVersion: 1,
            dataRef: 'https://bad.example/statuses',
            valueKey: 'statusId',
            labelKey: 'name',
          },
        },
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        code: AuthoringErrorCode.LookupSelectInvalid,
      });
    }
  });

  it('createConfigField should reject invalid derived-runtime authoring metadata', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValue({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValue({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);
    jest.spyOn(fieldRepo, 'findOne').mockResolvedValue(null as any);

    try {
      await service.createConfigField({
        tenantId: 1,
        configObjectId: 10,
        createdBy: 1,
        fieldKey: 'displayName',
        label: 'Display Name',
        fieldType: 'text',
        validationJson: {
          _six1DerivedRuntimeAuthoring: {
            schemaVersion: 1,
            operation: 'concat',
            sourceFieldKeys: [],
          },
        },
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        code: AuthoringErrorCode.DerivedRuntimeInvalid,
      });
    }
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

  it('listConfigFieldRules should return rules for a tenant-owned field', async () => {
    jest.spyOn(fieldRepo, 'findOne').mockResolvedValueOnce({
      configObjectFieldId: 11,
      configObjectId: 10,
    } as any);
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);
    jest.spyOn(fieldRuleRepo, 'find').mockResolvedValueOnce([
      {
        configObjectFieldRuleId: 21,
        configObjectFieldId: 11,
        isVisible: true,
      } as any,
    ]);

    const rules = await service.listConfigFieldRules({
      tenantId: 1,
      configObjectFieldId: 11,
    });

    expect(rules).toHaveLength(1);
    expect(rules[0].configObjectFieldRuleId).toBe(21);
  });

  it('createConfigFieldRule should create a row for tenant-owned sor_bound field', async () => {
    jest.spyOn(fieldRepo, 'findOne').mockResolvedValueOnce({
      configObjectFieldId: 11,
      configObjectId: 10,
    } as any);
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce({
      configTemplateSetId: 1,
      tenantId: 1,
    } as any);
    jest.spyOn(fieldRuleRepo, 'findOne').mockResolvedValueOnce(null as any);
    jest.spyOn(fieldRuleRepo, 'create').mockImplementation((v: any) => v);
    jest.spyOn(fieldRuleRepo, 'save').mockImplementation(async (v: any) => ({
      configObjectFieldRuleId: 31,
      ...v,
    }));
    jest.spyOn(auditLogRepo, 'create').mockImplementation((v: any) => v as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    const saved = await service.createConfigFieldRule({
      tenantId: 1,
      configObjectFieldId: 11,
      createdBy: 9,
      lifecycleStateKey: 'open',
      roleKey: 'manager',
      isVisible: true,
      isReadonly: false,
      isRequired: true,
      rulesJson: { maxLength: 20 },
    });

    expect(saved.configObjectFieldRuleId).toBe(31);
    expect(saved.roleKey).toBe('manager');
    expect(saved.isRequired).toBe(true);
  });

  it('createConfigFieldRule should reject fields outside tenant scope', async () => {
    jest.spyOn(fieldRepo, 'findOne').mockResolvedValueOnce({
      configObjectFieldId: 11,
      configObjectId: 10,
    } as any);
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce({
      configObjectId: 10,
      configTemplateSetId: 1,
      bindingMode: 'sor_bound',
    } as any);
    jest.spyOn(templateSetRepo, 'findOne').mockResolvedValueOnce(null as any);

    await expect(
      service.createConfigFieldRule({
        tenantId: 1,
        configObjectFieldId: 11,
        createdBy: 9,
      }),
    ).rejects.toThrow('Config field does not belong to the specified tenant.');
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

  it('getActiveScopedConfigView should return null when no config object exists for entityKey', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce(null as any);

    const result = await service.getActiveScopedConfigView({
      tenantId: 1,
      entityKey: 'category',
      viewType: 'list',
    });

    expect(result).toBeNull();
  });

  it('listActiveScopedConfigViews should return empty when no config object exists for entityKey', async () => {
    jest.spyOn(configObjectRepo, 'findOne').mockResolvedValueOnce(null as any);

    const result = await service.listActiveScopedConfigViews({
      tenantId: 1,
      entityKey: 'category',
    });

    expect(result).toEqual([]);
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
          schemaVersion: 1,
          table: {
            columns: ['unknownField'],
          },
        },
      }),
    ).rejects.toThrow('Scoped view config contains unknown field keys');
  });

  it('upsertScopedConfigView should reject invalid list view config_json before field-key checks', async () => {
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

    await expect(
      service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'list',
        updatedBy: 10,
        isActive: false,
        configJson: {
          schemaVersion: 1,
          notAllowed: true,
        } as Record<string, unknown>,
      }),
    ).rejects.toThrow('Unknown top-level key');
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
        schemaVersion: 1,
        table: { columns: ['external_openapi_field'] },
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

  it('upsertScopedConfigView should reject inline fieldDefinitions before detail schema (B-1)', async () => {
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

    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce({
      configObjectViewId: 900,
      configObjectId: 102,
      viewType: 'detail',
      tenantId: 1,
      isActive: false,
      viewKey: 'project_detail_1',
      name: 'Detail',
      description: null,
      roleKey: null,
      isDefault: false,
      configJson: { schemaVersion: 1, panels: [] },
    } as any);

    await expect(
      service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'detail',
        updatedBy: 10,
        isActive: false,
        configJson: {
          schemaVersion: 1,
          panels: [],
          fieldDefinitions: [{ fieldKey: 'ghost' }],
        } as Record<string, unknown>,
      }),
    ).rejects.toThrow(/fieldDefinitions/);
  });

  it('upsertScopedConfigView should reject unknown panel keys for detail views (B-3)', async () => {
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

    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce({
      configObjectViewId: 900,
      configObjectId: 102,
      viewType: 'detail',
      tenantId: 1,
      isActive: false,
      viewKey: 'project_detail_1',
      name: 'Detail',
      description: null,
      roleKey: null,
      isDefault: false,
      configJson: { schemaVersion: 1, panels: [] },
    } as any);

    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: { configObjectId: 102 } as any,
      fields: [],
    } as any);

    jest.spyOn(panelRepo, 'find').mockResolvedValue([
      { panelKey: 'header' },
    ] as any);

    jest.spyOn(viewRepo, 'save').mockImplementation(async (e) => e as any);
    jest.spyOn(auditLogRepo, 'create').mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    try {
      await service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'detail',
        updatedBy: 10,
        isActive: false,
        configJson: {
          schemaVersion: 1,
          panels: ['missing_panel'],
        },
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        code: AuthoringErrorCode.ViewPanelKeyUnknown,
      });
    }
  });

  it('upsertScopedConfigView should reject non-writable fields in form panel layouts', async () => {
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

    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce({
      configObjectViewId: 901,
      configObjectId: 102,
      viewType: 'form',
      tenantId: 1,
      isActive: false,
      viewKey: 'project_form_1',
      name: 'Form',
      configJson: { schemaVersion: 1, panels: ['main_section'] },
    } as any);

    jest.spyOn(service, 'getObjectSchema').mockResolvedValue({
      configObject: { configObjectId: 102 } as any,
      fields: [{ field: { fieldKey: 'readonlyField' } } as any],
      fieldRegistry: [
        {
          fieldKey: 'readonlyField',
          label: 'Readonly Field',
          fieldType: 'text',
          orderIndex: 10,
          canCreate: false,
          canUpdate: false,
        },
      ],
      relations: [],
    } as any);

    jest
      .spyOn(panelRepo, 'find')
      .mockResolvedValueOnce([{ panelKey: 'main_section' }] as any)
      .mockResolvedValueOnce([
        {
          panelKey: 'main_section',
          panelType: 'form-section',
          layoutConfig: {
            schemaVersion: 1,
            displayMode: 'form-section',
            layout: { fieldOrder: ['readonlyField'] },
          },
        },
      ] as any);

    await expect(
      service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'form',
        updatedBy: 10,
        isActive: false,
        configJson: {
          schemaVersion: 1,
          panels: ['main_section'],
        },
      }),
    ).rejects.toThrow('Form panels reference non-writable fields');
  });

  it('upsertScopedConfigView should reject missing inline_required relation panels in form', async () => {
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

    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce({
      configObjectViewId: 902,
      configObjectId: 102,
      viewType: 'form',
      tenantId: 1,
      isActive: false,
      viewKey: 'project_form_2',
      name: 'Form',
      configJson: { schemaVersion: 1, panels: ['main_section'] },
    } as any);

    jest.spyOn(service, 'getObjectSchema').mockResolvedValue({
      configObject: { configObjectId: 102 } as any,
      fields: [{ field: { fieldKey: 'name' } } as any],
      fieldRegistry: [
        {
          fieldKey: 'name',
          label: 'Name',
          fieldType: 'text',
          orderIndex: 10,
          canCreate: true,
          canUpdate: true,
          requiredOnCreate: true,
        },
      ],
      relations: [
        {
          relationshipKey: 'project_role_descriptions',
          queryConfig: {
            inlineRelation: {
              mode: 'inline_required',
            },
          },
        },
      ],
    } as any);

    jest
      .spyOn(panelRepo, 'find')
      .mockResolvedValueOnce([{ panelKey: 'main_section' }] as any)
      .mockResolvedValueOnce([
        {
          panelKey: 'main_section',
          panelType: 'form-section',
          layoutConfig: {
            schemaVersion: 1,
            displayMode: 'form-section',
            layout: { fieldOrder: ['name'] },
          },
        },
      ] as any);

    await expect(
      service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'form',
        updatedBy: 10,
        isActive: false,
        configJson: {
          schemaVersion: 1,
          panels: ['main_section'],
        },
      }),
    ).rejects.toThrow('Form panels must include inline_required relationships');
  });

  it('createConfigViewPanel should reject related panel without relation membership keys', async () => {
    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce({
      configObjectViewId: 8802,
      configObjectId: 102,
    } as any);
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
    jest.spyOn(panelRepo, 'findOne').mockResolvedValueOnce(null as any);

    await expect(
      service.createConfigViewPanel({
        tenantId: 1,
        configObjectViewId: 8802,
        createdBy: 1,
        panelKey: 'related_roles',
        title: 'Related Roles',
        panelType: 'table',
        layoutConfig: {
          schemaVersion: 1,
          displayMode: 'table',
          dataBinding: 'relation',
        layout: { columns: ['name'] },
          actions: { assignRef: 'x' },
        },
      }),
    ).rejects.toThrow('layout.relationKey');
  });

  it('createConfigViewPanel should accept valid related relation-membership panel', async () => {
    jest.spyOn(viewRepo, 'findOne').mockResolvedValueOnce({
      configObjectViewId: 8802,
      configObjectId: 102,
    } as any);
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
    jest.spyOn(panelRepo, 'findOne').mockResolvedValueOnce(null as any);
    jest.spyOn(panelRepo, 'create').mockImplementation((dto) => dto as any);
    jest.spyOn(panelRepo, 'save').mockImplementation(async (row: any) => ({
      configObjectViewPanelId: 7733,
      ...row,
    }));
    jest.spyOn(auditLogRepo, 'create').mockImplementation((row) => row as any);
    jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

    const out = await service.createConfigViewPanel({
      tenantId: 1,
      configObjectViewId: 8802,
      createdBy: 1,
      panelKey: 'related_roles',
      title: 'Related Roles',
      panelType: 'table',
      layoutConfig: {
        schemaVersion: 1,
        displayMode: 'table',
        dataBinding: 'relation',
        layout: {
          columns: ['name'],
          relationKey: 'project_roles',
          targetEntityKey: 'roles',
          selectionControl: 'checkbox',
        },
        actions: {
          assignRef: 'six1:action:project.roles.assign',
          unassignRef: 'six1:action:project.roles.unassign',
        },
      },
    });

    expect(out.configObjectViewPanelId).toBe(7733);
    expect(out.panelType).toBe('table');
  });

  describe('C-4 authoring vertical slice (sequential service calls, mocked repos)', () => {
    const projectCo = {
      configObjectId: 102,
      configTemplateSetId: 10,
      objectType: 'project',
      bindingMode: 'sor_bound',
    } as any;

    const templateRow = {
      configTemplateSetId: 10,
      tenantId: 1,
    } as any;

    it('chains field → list view → detail view + panel → relationship without throwing', async () => {
      jest.spyOn(configObjectRepo, 'findOne').mockImplementation(async (opts: any) => {
        const w = opts?.where ?? {};
        if (w.objectType === 'role' && w.status === 'PUBLISHED') {
          return { objectType: 'role', status: 'PUBLISHED' } as any;
        }
        if (w.objectType === 'permission' && w.status === 'PUBLISHED') {
          return { objectType: 'permission', status: 'PUBLISHED' } as any;
        }
        if (w.configObjectId === 102) {
          return projectCo;
        }
        if (w.objectType === 'project') {
          return projectCo;
        }
        return null as any;
      });

      jest
        .spyOn(templateSetRepo, 'findOne')
        .mockResolvedValue(templateRow as any);

      jest.spyOn(fieldRepo, 'findOne').mockResolvedValueOnce(null as any);
      jest
        .spyOn(fieldRepo, 'create')
        .mockImplementation((dto) => ({ ...dto, configObjectFieldId: 9101 }) as any);
      jest.spyOn(fieldRepo, 'save').mockImplementation(async (e) => e as any);
      jest.spyOn(auditLogRepo, 'create').mockImplementation((row) => row as any);
      jest.spyOn(auditLogRepo, 'save').mockResolvedValue({} as any);

      await service.createConfigField({
        tenantId: 1,
        configObjectId: 102,
        createdBy: 1,
        fieldKey: 'c4_custom_note',
        label: 'C4 note',
        fieldType: 'text',
      });

      jest.spyOn(service, 'getObjectSchema').mockResolvedValue({
        configObject: { configObjectId: 102 } as any,
        fields: [
          { field: { fieldKey: 'project_type' } } as any,
          { field: { fieldKey: 'c4_custom_note' } } as any,
        ],
      } as any);

      jest.spyOn(viewRepo, 'findOne').mockImplementation(async (opts: any) => {
        const w = opts?.where ?? {};
        if (w.configObjectViewId === 8802) {
          return {
            configObjectViewId: 8802,
            configObjectId: 102,
            viewType: 'detail',
            tenantId: 1,
            isActive: false,
            viewKey: 'project_detail_c4',
            name: 'Detail',
            description: null,
            roleKey: null,
            isDefault: false,
            configJson: { schemaVersion: 1, panels: [] },
          } as any;
        }
        if (w.viewType === 'list' && !w.configObjectViewId) {
          return null as any;
        }
        if (w.viewType === 'detail' && !w.configObjectViewId) {
          return null as any;
        }
        return null as any;
      });

      jest.spyOn(viewRepo, 'create').mockImplementation((dto) => ({ ...dto }) as any);
      jest.spyOn(viewRepo, 'save').mockImplementation(async (row: any) => {
        if (row.configObjectViewId) {
          return row as any;
        }
        if (row.viewType === 'list') {
          return { ...row, configObjectViewId: 8801 } as any;
        }
        if (row.viewType === 'detail') {
          return { ...row, configObjectViewId: 8802 } as any;
        }
        return { ...row, configObjectViewId: 8899 } as any;
      });
      jest.spyOn(viewRepo, 'remove').mockResolvedValue({} as any);

      const listView = await service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'list',
        updatedBy: 1,
        isActive: false,
        configJson: {
          schemaVersion: 1,
          defaultPresentation: 'table',
          table: { columns: ['project_type', 'c4_custom_note'] },
          board: { groupByField: 'project_type', cardTitleField: 'c4_custom_note' },
        },
      });
      expect(listView.configObjectViewId).toBe(8801);

      await service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'detail',
        updatedBy: 1,
        isActive: false,
        configJson: {},
      });

      jest.spyOn(panelRepo, 'findOne').mockResolvedValueOnce(null as any);
      jest
        .spyOn(panelRepo, 'create')
        .mockImplementation((dto) => ({ ...dto, configObjectViewPanelId: 7701 }) as any);
      jest.spyOn(panelRepo, 'save').mockImplementation(async (e) => e as any);

      const panel = await service.createConfigViewPanel({
        tenantId: 1,
        configObjectViewId: 8802,
        createdBy: 1,
        panelKey: 'main_section',
        title: 'Main',
        panelType: 'summary',
        layoutConfig: {
          schemaVersion: 1,
          displayMode: 'summary',
          layout: { keyValueFields: ['project_type'] },
        },
      });
      expect(panel.panelKey).toBe('main_section');

      jest.spyOn(panelRepo, 'find').mockResolvedValue([{ panelKey: 'main_section' }] as any);

      const detailUpdated = await service.upsertScopedConfigView({
        tenantId: 1,
        entityKey: 'project',
        viewType: 'detail',
        updatedBy: 1,
        isActive: false,
        configObjectViewId: 8802,
        configJson: {
          schemaVersion: 1,
          panels: ['main_section'],
        },
      });
      expect(detailUpdated.configObjectViewId).toBe(8802);

      jest.spyOn(relationshipRepo, 'findOne').mockResolvedValueOnce(null as any);
      jest
        .spyOn(relationshipRepo, 'create')
        .mockImplementation((dto) => ({ ...dto, configObjectRelationshipId: 6601 }) as any);
      jest.spyOn(relationshipRepo, 'save').mockImplementation(async (e) => e as any);

      const rel = await service.createConfigRelationship({
        tenantId: 1,
        fromObjectType: 'role',
        toObjectType: 'permission',
        relationshipKey: 'c4_role_perms',
        cardinality: 'many_to_many',
        createdBy: 1,
      });
      expect(rel.relationshipKey).toBe('c4_role_perms');
    });
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

  it('getRuntimeManifest should include resolved list/detail/form sections with runtime blocks', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: {
        objectType: 'project',
      },
      fields: [],
      fieldRegistry: [
        { fieldKey: 'name', label: 'Name' },
        { fieldKey: 'status', label: 'Status' },
      ],
      relations: [],
      relatedFieldRegistryByRelationKey: {},
      relationManifestsByKey: {},
    } as any);

    jest
      .spyOn(service, 'getActiveScopedConfigView')
      .mockResolvedValueOnce({
        configObjectViewId: 1,
        viewType: 'list',
        configJson: {
          schemaVersion: 1,
          defaultPresentation: 'table',
          table: { columns: ['name', 'status'] },
        },
      } as any)
      .mockResolvedValueOnce({
        configObjectViewId: 2,
        viewType: 'detail',
        configJson: {
          schemaVersion: 1,
          panels: ['main_panel'],
        },
      } as any)
      .mockResolvedValueOnce({
        configObjectViewId: 3,
        viewType: 'form',
        configJson: {
          schemaVersion: 1,
          panels: ['main_panel'],
        },
      } as any);

    jest.spyOn(panelRepo, 'find').mockResolvedValue([
      {
        panelKey: 'main_panel',
        title: 'Main',
        panelType: 'summary',
        orderIndex: 10,
        layoutConfig: { schemaVersion: 1, displayMode: 'summary', layout: {} },
      },
    ] as any);

    const manifest = await service.getRuntimeManifest({
      tenantId: 1,
      entityKey: 'project',
    });

    expect(manifest.list?.resolved).toBeDefined();
    expect((manifest.list?.resolved as any)?.table?.columns).toEqual(['name', 'status']);
    expect((manifest.detail?.resolved as any)?.panels?.length).toBe(1);
    expect((manifest.form?.resolved as any)?.panels?.length).toBe(1);
  });

  it('getRuntimeManifest should emit schema-not-found diagnostic when schema is missing', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce(null);

    const manifest = await service.getRuntimeManifest({
      tenantId: 1,
      entityKey: 'project',
      includeDiagnostics: true,
    });

    expect(manifest.list).toBeNull();
    expect(manifest.detail).toBeNull();
    expect(manifest.form).toBeNull();
    expect(
      manifest.diagnostics.some((d) => d.code === RuntimeErrorCode.SchemaNotFound),
    ).toBe(
      true,
    );
  });

  it('getRuntimeManifest should evaluate derivedRuntimeConfig preview values', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: {
        objectType: 'project',
      },
      fields: [
        {
          field: {
            fieldKey: 'firstName',
            defaultValue: 'John',
          },
          rules: [],
        },
        {
          field: {
            fieldKey: 'lastName',
            defaultValue: 'Doe',
          },
          rules: [],
        },
      ],
      fieldRegistry: [
        { fieldKey: 'firstName', label: 'First name' },
        { fieldKey: 'lastName', label: 'Last name' },
        {
          fieldKey: 'displayName',
          label: 'Display name',
          derivedRuntimeConfig: {
            schemaVersion: 1,
            operation: 'concat',
            sourceFieldKeys: ['firstName', 'lastName'],
            separator: ' ',
            trim: true,
            nullDisplayValue: 'N/A',
          },
        },
        {
          fieldKey: 'fallbackName',
          label: 'Fallback name',
          derivedRuntimeConfig: {
            schemaVersion: 1,
            operation: 'coalesce',
            sourceFieldKeys: ['preferredName', 'firstName'],
            nullDisplayValue: 'N/A',
            trim: true,
          },
        },
      ],
      relations: [],
      relatedFieldRegistryByRelationKey: {},
      relationManifestsByKey: {},
    } as any);

    jest
      .spyOn(service, 'getActiveScopedConfigView')
      .mockResolvedValueOnce({
        configObjectViewId: 10,
        viewType: 'list',
        configJson: {
          schemaVersion: 1,
          table: { columns: ['displayName', 'fallbackName'] },
        },
      } as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const manifest = await service.getRuntimeManifest({
      tenantId: 1,
      entityKey: 'project',
    });

    const derivedRuntime = (manifest.list?.resolved as any)?.derivedRuntime;
    expect(derivedRuntime).toBeDefined();
    expect(derivedRuntime.valuesByFieldKey.displayName).toBe('John Doe');
    expect(derivedRuntime.valuesByFieldKey.fallbackName).toBe('John');
  });

  it('composeRuntimeSubmitPayload should compose root fields and inline relation block by path', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: { objectType: 'role' },
      fieldRegistry: [
        { fieldKey: 'name', canCreate: true, requiredOnCreate: true },
        { fieldKey: 'slug', canCreate: true },
      ],
      relations: [
        {
          relationshipKey: 'role_descriptions',
          queryConfig: {
            inlineRelation: { mode: 'inline_required', path: 'roleDescriptions' },
          },
        },
      ],
    } as any);

    const out = await service.composeRuntimeSubmitPayload({
      tenantId: 1,
      entityKey: 'role',
      operation: 'create',
      fieldValues: { name: 'Admin', slug: 'admin' },
      relationBlocks: {
        role_descriptions: [{ languageId: 1, name: 'Administrator' }],
      },
    });

    expect(out.payload).toEqual({
      name: 'Admin',
      slug: 'admin',
      roleDescriptions: [{ languageId: 1, name: 'Administrator' }],
    });
  });

  it('composeRuntimeSubmitPayload should reject missing inline_required relation block', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: { objectType: 'role' },
      fieldRegistry: [{ fieldKey: 'name', canCreate: true, requiredOnCreate: true }],
      relations: [
        {
          relationshipKey: 'role_descriptions',
          queryConfig: {
            inlineRelation: { mode: 'inline_required', path: 'roleDescriptions' },
          },
        },
      ],
    } as any);

    await expect(
      service.composeRuntimeSubmitPayload({
        tenantId: 1,
        entityKey: 'role',
        operation: 'create',
        fieldValues: { name: 'Admin' },
        relationBlocks: {},
      }),
    ).rejects.toThrow('Missing inline_required relation blocks');
  });

  it('getRuntimeManifest should clamp unsafe relation query defaults', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: { objectType: 'project' },
      fields: [],
      fieldRegistry: [{ fieldKey: 'name', label: 'Name' }],
      relations: [],
      relationManifestsByKey: {
        project_roles: {
          queryDefaults: { page: 1, limit: 500, depth: 9 },
        },
      },
      relatedFieldRegistryByRelationKey: {},
    } as any);

    jest
      .spyOn(service, 'getActiveScopedConfigView')
      .mockResolvedValueOnce({
        configObjectViewId: 1,
        viewType: 'list',
        configJson: { schemaVersion: 1, table: { columns: ['name'] } },
      } as any)
      .mockResolvedValueOnce({
        configObjectViewId: 2,
        viewType: 'detail',
        configJson: { schemaVersion: 1, panels: [] },
      } as any)
      .mockResolvedValueOnce({
        configObjectViewId: 3,
        viewType: 'form',
        configJson: { schemaVersion: 1, panels: [] },
      } as any);

    const manifest = await service.getRuntimeManifest({
      tenantId: 1,
      entityKey: 'project',
    });
    const detailDefaults = (manifest.detail?.resolved as any)?.relationQueryDefaultsByKey
      ?.project_roles;
    expect(detailDefaults.limit).toBe(100);
    expect(detailDefaults.depth).toBe(1);
    expect(
      manifest.diagnostics.some((d) => d.code === RuntimeErrorCode.RelationQueryDepthExceeded),
    ).toBe(true);
  });

  it('validateRuntimeRelationAction should reject missing required permissions', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: { objectType: 'project' },
      fields: [],
      fieldRegistry: [],
      relationManifestsByKey: {
        project_roles: {
          actions: {
            assignRef: 'six1:action:project.roles.assign',
          },
          requiredPermissionsByActionRef: {
            'six1:action:project.roles.assign': ['project.manage_roles'],
          },
        },
      },
    } as any);

    await expect(
      service.validateRuntimeRelationAction({
        tenantId: 1,
        entityKey: 'project',
        relationKey: 'project_roles',
        actionRef: 'six1:action:project.roles.assign',
        grantedPermissions: [],
      }),
    ).rejects.toThrow('Missing permissions for relation action');
  });

  it('getRuntimeManifest should keep contract stable across binding-mode matrix', async () => {
    const bindingModes: Array<'system_table' | 'sor_bound' | 'standalone'> = [
      'system_table',
      'sor_bound',
      'standalone',
    ];

    for (const mode of bindingModes) {
      jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
        configObject: { objectType: mode === 'sor_bound' ? 'project' : mode, bindingMode: mode },
        fields: [],
        fieldRegistry: [{ fieldKey: 'name', label: 'Name' }],
        relations: [],
        relationManifestsByKey: {},
        relatedFieldRegistryByRelationKey: {},
      } as any);

      jest
        .spyOn(service, 'getActiveScopedConfigView')
        .mockResolvedValueOnce({
          configObjectViewId: 1,
          viewType: 'list',
          configJson: { schemaVersion: 1, table: { columns: ['name'] } },
        } as any)
        .mockResolvedValueOnce({
          configObjectViewId: 2,
          viewType: 'detail',
          configJson: { schemaVersion: 1, panels: [] },
        } as any)
        .mockResolvedValueOnce({
          configObjectViewId: 3,
          viewType: 'form',
          configJson: { schemaVersion: 1, panels: [] },
        } as any);

      const manifest = await service.getRuntimeManifest({
        tenantId: 1,
        entityKey: mode === 'sor_bound' ? 'project' : mode,
      });

      expect(manifest.entityKey).toBe(mode === 'sor_bound' ? 'project' : mode);
      expect(manifest.list?.viewType).toBe('list');
      expect(manifest.detail?.viewType).toBe('detail');
      expect(manifest.form?.viewType).toBe('form');
      expect((manifest.list?.resolved as any)?.fieldRegistry).toBeDefined();
      expect((manifest.detail?.resolved as any)?.relations).toBeDefined();
    }
  });

  it('validateRuntimeRelationAction should allow relation-heavy action when permissions are satisfied', async () => {
    jest.spyOn(service, 'getObjectSchema').mockResolvedValueOnce({
      configObject: { objectType: 'role' },
      fields: [],
      fieldRegistry: [],
      relationManifestsByKey: {
        role_permissions: {
          actions: {
            assignRef: 'six1:action:role.permissions.assign',
            unassignRef: 'six1:action:role.permissions.unassign',
          },
          requiredPermissionsByActionRef: {
            'six1:action:role.permissions.assign': ['roles.manage_permissions'],
          },
        },
      },
    } as any);

    const result = await service.validateRuntimeRelationAction({
      tenantId: 1,
      entityKey: 'role',
      relationKey: 'role_permissions',
      actionRef: 'six1:action:role.permissions.assign',
      grantedPermissions: ['roles.manage_permissions'],
    });

    expect(result.allowed).toBe(true);
    expect(result.missingPermissions).toEqual([]);
  });
});

