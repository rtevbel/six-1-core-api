import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ConfigTemplateSetEntity } from './entities/config_template_set.entity';
import {
  ConfigObjectBindingMode,
  ConfigObjectEntity,
  ConfigObjectStatus,
} from './entities/config_object.entity';
import { ConfigObjectFieldEntity } from './entities/config_object_field.entity';
import { ConfigObjectFieldRuleEntity } from './entities/config_object_field_rule.entity';
import { ConfigAuditLogEntity } from './entities/config_audit_log.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectMetaEntity } from '../projects/entities/project_meta.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';
import { TaskMetaEntity } from '../projects/tasks/entities/task_meta.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { CustomerMetaEntity } from '../customers/entities/customer_meta.entity';
import { CustomerContactInfoEntity } from '../customers/customer_contact_info/entities/customer_contact_info.entity';
import { CustomerContactInfoMetaEntity } from '../customers/customer_contact_info/entities/customer_contact_info_meta.entity';
import { ResourceEntity } from '../scheduler/entities/resource.entity';
import { ResourceMetaEntity } from '../scheduler/entities/resource_meta.entity';
import { runnerMetadataForBindingMode } from './config-object-runner';
import {
  ApplySorBoundInstancePatchResult,
  ConfigObjectResolvedInstance,
  ConfigObjectResolvedSorInstance,
  ConfigObjectResolvedStandaloneInstance,
  ConfigObjectRunnerSchemaView,
  ConfigObjectSchemaView,
  ConfigObjectFieldView,
} from './interfaces/config-object-resolved-instance.interface';
import {
  buildMergedFieldOrder,
  CONFIG_OBJECT_FIELD_MERGE_POLICY,
  getSorFieldDescriptors,
  getWritableSorFieldKeys,
} from './sor-field-descriptors.registry';
import {
  CONFIG_OBJECT_SYSTEM_TABLE_FIELDS_FORBIDDEN_MESSAGE,
  CONFIG_OBJECT_SYSTEM_TABLE_RESOLVE_FORBIDDEN_MESSAGE,
} from './constants';
import {
  ConfigCustomObjectInstanceEntity,
  ConfigCustomObjectInstanceStatus,
} from './entities/config_custom_object_instance.entity';
import { ConfigObjectLifecycleEntity } from './entities/config_object_lifecycle.entity';
import { ConfigObjectRelationshipEntity } from './entities/config_object_relationship.entity';
import { ConfigObjectViewEntity } from './entities/config_object_view.entity';
import { ConfigObjectViewPanelEntity } from './entities/config_object_view_panel.entity';
import { RelatedObjectsResult } from './interfaces/config-object-resolved-instance.interface';
import {
  ConfigObjectStatusMappingEntity,
  ConfigObjectStatusSource,
} from './entities/config_object_status_mapping.entity';

/**
 * Service responsible for resolving configuration metadata and
 * merging it with core system-of-record entities.
 *
 * @version 0.0.1
 */
@Injectable()
export class ConfigObjectsService {
  constructor(
    @InjectRepository(ConfigTemplateSetEntity)
    private readonly templateSetRepository: Repository<ConfigTemplateSetEntity>,
    @InjectRepository(ConfigObjectEntity)
    private readonly configObjectRepository: Repository<ConfigObjectEntity>,
    @InjectRepository(ConfigObjectFieldEntity)
    private readonly configObjectFieldRepository: Repository<ConfigObjectFieldEntity>,
    @InjectRepository(ConfigObjectFieldRuleEntity)
    private readonly configObjectFieldRuleRepository: Repository<ConfigObjectFieldRuleEntity>,
    @InjectRepository(ConfigObjectLifecycleEntity)
    private readonly lifecycleRepository: Repository<ConfigObjectLifecycleEntity>,
    @InjectRepository(ConfigObjectRelationshipEntity)
    private readonly relationshipRepository: Repository<ConfigObjectRelationshipEntity>,
    @InjectRepository(ConfigObjectViewEntity)
    private readonly viewRepository: Repository<ConfigObjectViewEntity>,
    @InjectRepository(ConfigObjectViewPanelEntity)
    private readonly panelRepository: Repository<ConfigObjectViewPanelEntity>,
    @InjectRepository(ConfigAuditLogEntity)
    private readonly configAuditLogRepository: Repository<ConfigAuditLogEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ProjectMetaEntity)
    private readonly projectMetaRepository: Repository<ProjectMetaEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(TaskMetaEntity)
    private readonly taskMetaRepository: Repository<TaskMetaEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(CustomerMetaEntity)
    private readonly customerMetaRepository: Repository<CustomerMetaEntity>,
    @InjectRepository(CustomerContactInfoEntity)
    private readonly customerContactInfoRepository: Repository<CustomerContactInfoEntity>,
    @InjectRepository(CustomerContactInfoMetaEntity)
    private readonly customerContactInfoMetaRepository: Repository<CustomerContactInfoMetaEntity>,
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
    @InjectRepository(ResourceMetaEntity)
    private readonly resourceMetaRepository: Repository<ResourceMetaEntity>,
    @InjectRepository(ConfigCustomObjectInstanceEntity)
    private readonly customObjectInstanceRepository: Repository<ConfigCustomObjectInstanceEntity>,
    @InjectRepository(ConfigObjectStatusMappingEntity)
    private readonly configObjectStatusMappingRepository: Repository<ConfigObjectStatusMappingEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Normalizes nullable tenant identifiers to an effective value.
   *
   * We use `null` to represent system/global scope, and positive integers for
   * tenant-scoped configuration.
   */
  private getEffectiveTenantId(
    tenantId: number | null | undefined,
  ): number | null {
    if (typeof tenantId === 'number' && tenantId > 0) {
      return tenantId;
    }
    return null;
  }

  /**
   * Builds a `where` clause for looking up a template set by scope.
   *
   * When `effectiveTenantId` is null (global / super-admin scope), match by
   * `configTemplateSetId` only so tenant-owned template sets resolve correctly.
   * When a tenant id is set, require `tenant_id` on the template set to match.
   */
  private templateSetWhereForTenantScope(
    configTemplateSetId: number,
    effectiveTenantId: number | null,
  ):
    | { configTemplateSetId: number }
    | { configTemplateSetId: number; tenantId: number } {
    if (effectiveTenantId === null) {
      return { configTemplateSetId };
    }
    return { configTemplateSetId, tenantId: effectiveTenantId };
  }

  /**
   * Coerces optional ids from query/RPC payloads (string or number) to a
   * positive integer, or `undefined` when absent or invalid.
   *
   * Avoids truthy checks on `configTemplateSetId` so string `"1001"` and
   * omitted values behave consistently with filtering logic.
   */
  private normalizeOptionalPositiveInt(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      return undefined;
    }
    const int = Math.trunc(n);
    return int >= 1 ? int : undefined;
  }

  /**
   * Normalizes binding mode and SoR table name for create/update validation.
   */
  private normalizeConfigObjectBinding(
    bindingMode: ConfigObjectBindingMode | undefined,
    sorTableName: string | null | undefined,
  ): { bindingMode: ConfigObjectBindingMode; sorTableName: string | null } {
    const mode: ConfigObjectBindingMode = bindingMode ?? 'sor_bound';
    if (mode === 'standalone') {
      return { bindingMode: mode, sorTableName: null };
    }
    const trimmed = typeof sorTableName === 'string' ? sorTableName.trim() : '';
    if (!trimmed) {
      throw new RpcException(
        'sor_table_name is required when binding_mode is sor_bound or system_table.',
      );
    }
    return { bindingMode: mode, sorTableName: trimmed };
  }

  /**
   * `system_table` definitions do not support `config_object_fields` (designer hides that panel).
   */
  private assertConfigObjectAllowsDesignerFields(
    configObject: ConfigObjectEntity,
  ): void {
    if (configObject.bindingMode === 'system_table') {
      throw new RpcException(CONFIG_OBJECT_SYSTEM_TABLE_FIELDS_FORBIDDEN_MESSAGE);
    }
  }

  /**
   * Merges field definitions with a JSON source (meta or standalone payload).
   */
  private mergeDynamicFieldsFromSource(
    schema: ConfigObjectSchemaView,
    source: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    const dynamicFields: Record<string, unknown> = {};
    const src =
      source !== null && typeof source === 'object' && !Array.isArray(source)
        ? source
        : {};

    for (const fieldView of schema.fields) {
      const fieldKey = fieldView.field.fieldKey;
      const valueFromSource = Object.prototype.hasOwnProperty.call(
        src,
        fieldKey,
      )
        ? src[fieldKey]
        : undefined;

      if (valueFromSource !== undefined) {
        dynamicFields[fieldKey] = valueFromSource;
      } else if (fieldView.field.defaultValue !== null) {
        dynamicFields[fieldKey] = fieldView.field.defaultValue as unknown;
      }
    }

    return dynamicFields;
  }

  private normalizeCustomInstancePayload(
    payload: unknown,
  ): Record<string, unknown> {
    if (
      payload !== null &&
      typeof payload === 'object' &&
      !Array.isArray(payload)
    ) {
      return { ...(payload as Record<string, unknown>) };
    }
    return {};
  }

  private extractConfiguredFieldKeysFromViewConfig(
    configJson: Record<string, unknown> | null | undefined,
  ): string[] {
    if (!configJson || typeof configJson !== 'object') {
      return [];
    }

    const discovered = new Set<string>();

    const visit = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const item of node) {
          visit(item);
        }
        return;
      }

      if (!node || typeof node !== 'object') {
        return;
      }

      const obj = node as Record<string, unknown>;

      const directFieldKey = obj.fieldKey;
      if (typeof directFieldKey === 'string' && directFieldKey.trim().length > 0) {
        discovered.add(directFieldKey.trim());
      }

      for (const key of ['columns', 'fields', 'fieldOrder', 'fieldKeys']) {
        const value = obj[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'string' && item.trim().length > 0) {
              discovered.add(item.trim());
            } else {
              visit(item);
            }
          }
        }
      }

      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') {
          visit(value);
        }
      }
    };

    visit(configJson);
    return Array.from(discovered.values());
  }

  private async assertScopedViewConfigFieldKeysExist(params: {
    tenantId: number | null;
    entityKey: string;
    configJson: Record<string, unknown> | null;
  }): Promise<void> {
    const { tenantId, entityKey, configJson } = params;
    if (!configJson) {
      return;
    }

    const schema = await this.getObjectSchema(tenantId, entityKey);
    if (!schema) {
      throw new RpcException('Unable to resolve schema for scoped view validation.');
    }

    const availableFieldKeys = new Set(
      schema.fields.map((view) => view.field.fieldKey),
    );

    const configuredFieldKeys =
      this.extractConfiguredFieldKeysFromViewConfig(configJson);
    const invalidFieldKeys = configuredFieldKeys.filter(
      (fieldKey) => !availableFieldKeys.has(fieldKey),
    );

    if (invalidFieldKeys.length > 0) {
      throw new RpcException(
        `Scoped view config contains unknown field keys: ${invalidFieldKeys.join(', ')}`,
      );
    }
  }

  /**
   * Loads a config object and ensures it belongs to the tenant scope and is standalone.
   */
  private async getStandaloneConfigObjectForTenant(
    configObjectId: number,
    effectiveTenantId: number | null,
  ): Promise<ConfigObjectEntity> {
    const existing = await this.configObjectRepository.findOne({
      where: { configObjectId },
    });

    if (!existing) {
      throw new RpcException('Config object not found.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        existing.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    if (existing.bindingMode !== 'standalone') {
      throw new RpcException(
        'Custom object instances are only supported for standalone configurable objects.',
      );
    }

    return existing;
  }

  /**
   * Enriches the base schema with Object Runner metadata (`runnerKind`, resolution hints)
   * and authoritative SoR vs custom field merge order.
   */
  private enrichSchemaViewWithRunner(
    schema: ConfigObjectSchemaView,
  ): ConfigObjectRunnerSchemaView {
    const meta = runnerMetadataForBindingMode(schema.configObject.bindingMode);
    const base: ConfigObjectRunnerSchemaView = {
      ...schema,
      ...meta,
      fieldMergePolicy: CONFIG_OBJECT_FIELD_MERGE_POLICY,
      sorFieldDescriptors: [],
      mergedFieldOrder: [],
    };
    return this.attachMergedFieldOrder(base);
  }

  /**
   * Fills `sorFieldDescriptors` and `mergedFieldOrder` (SoR first, then `config_object_fields`).
   */
  private attachMergedFieldOrder(
    schema: ConfigObjectRunnerSchemaView,
  ): ConfigObjectRunnerSchemaView {
    if (schema.configObject.bindingMode === 'system_table') {
      return {
        ...schema,
        sorFieldDescriptors: [],
        mergedFieldOrder: [],
      };
    }

    const typeKey = schema.configObject.objectType;
    const sorFieldDescriptors = getSorFieldDescriptors(typeKey);
    const customMeta = schema.fields.map((fv) => ({
      configObjectFieldId: fv.field.configObjectFieldId,
      fieldKey: fv.field.fieldKey,
      orderIndex: fv.field.orderIndex,
      sectionKey: fv.field.sectionKey,
    }));
    const mergedFieldOrder = buildMergedFieldOrder(typeKey, customMeta);

    return {
      ...schema,
      sorFieldDescriptors,
      mergedFieldOrder,
    };
  }

  /**
   * Applies allowlisted `corePatch` and `metaPatch` in one DB transaction for
   * `sor_bound` types supported by {@link loadCoreAndMeta}.
   *
   * Gateway should enforce domain permissions (e.g. `projects.update`) before calling.
   */
  async applySorBoundInstancePatch(params: {
    tenantId: number;
    objectType: string;
    coreId: number;
    corePatch?: Record<string, unknown>;
    metaPatch?: Record<string, unknown>;
    customerId?: number;
  }): Promise<ApplySorBoundInstancePatchResult> {
    const {
      tenantId,
      objectType,
      coreId,
      corePatch = {},
      metaPatch = {},
      customerId,
    } = params;

    if (typeof tenantId !== 'number' || tenantId < 1) {
      throw new RpcException('tenantId is required.');
    }

    const schema = await this.getObjectSchema(tenantId, objectType);
    if (!schema) {
      throw new RpcException('Configuration schema not found for object type.');
    }

    if (schema.configObject.bindingMode !== 'sor_bound') {
      throw new RpcException(
        'apply_sor_bound_instance_patch is only valid for sor_bound objects.',
      );
    }

    if (!getSorFieldDescriptors(objectType).length) {
      throw new RpcException(
        `apply_sor_bound_instance_patch is not implemented for object_type: ${objectType}.`,
      );
    }

    const writableSor = getWritableSorFieldKeys(objectType);
    const allowedMetaKeys = new Set(
      schema.fields.map((f) => f.field.fieldKey),
    );

    const filteredCore: Record<string, unknown> = {};
    for (const key of Object.keys(corePatch)) {
      if (writableSor.has(key)) {
        filteredCore[key] = corePatch[key];
      }
    }

    const filteredMeta: Record<string, unknown> = {};
    for (const key of Object.keys(metaPatch)) {
      if (allowedMetaKeys.has(key)) {
        filteredMeta[key] = metaPatch[key];
      }
    }

    if (!Object.keys(filteredCore).length && !Object.keys(filteredMeta).length) {
      throw new RpcException(
        'No patch entries matched allowed SoR or custom field keys.',
      );
    }

    return this.dataSource.transaction(async (manager) =>
      this.applySorBoundPatchInTransaction(
        manager,
        objectType,
        coreId,
        tenantId,
        filteredCore,
        filteredMeta,
        customerId,
      ),
    );
  }

  private async applySorBoundPatchInTransaction(
    manager: EntityManager,
    objectType: string,
    coreId: number,
    tenantId: number,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
    customerId?: number,
  ): Promise<ApplySorBoundInstancePatchResult> {
    if (objectType === 'project') {
      return this.patchProjectCoreAndMeta(
        manager,
        coreId,
        tenantId,
        filteredCore,
        filteredMeta,
      );
    }
    if (objectType === 'task') {
      return this.patchTaskCoreAndMeta(
        manager,
        coreId,
        tenantId,
        filteredCore,
        filteredMeta,
      );
    }
    if (objectType === 'customer') {
      return this.patchCustomerCoreAndMeta(
        manager,
        coreId,
        filteredCore,
        filteredMeta,
      );
    }
    if (objectType === 'customer_contact') {
      return this.patchCustomerContactCoreAndMeta(
        manager,
        coreId,
        filteredCore,
        filteredMeta,
        customerId,
      );
    }
    if (objectType === 'resource') {
      return this.patchResourceCoreAndMeta(
        manager,
        coreId,
        tenantId,
        filteredCore,
        filteredMeta,
      );
    }

    throw new RpcException(
      `apply_sor_bound_instance_patch is not implemented for object_type: ${objectType}.`,
    );
  }

  private assignFilteredCoreProps(
    entity: Record<string, unknown>,
    filteredCore: Record<string, unknown>,
    objectType: string,
  ): void {
    for (const [key, value] of Object.entries(filteredCore)) {
      if (objectType === 'resource' && key === 'isShared') {
        entity[key] =
          value === true ||
          value === 1 ||
          value === '1' ||
          value === 'true'
            ? 1
            : 0;
        continue;
      }
      entity[key] = value;
    }
  }

  private async patchProjectCoreAndMeta(
    manager: EntityManager,
    coreId: number,
    tenantId: number,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const project = await manager.findOne(ProjectEntity, {
      where: { projectId: coreId },
    });
    if (!project) {
      throw new RpcException('Project not found.');
    }
    if (project.tenantId !== tenantId) {
      throw new RpcException('Project does not belong to the specified tenant.');
    }

    if (Object.keys(filteredCore).length) {
      this.assignFilteredCoreProps(
        project as unknown as Record<string, unknown>,
        filteredCore,
        'project',
      );
      await manager.save(project);
    }

    let metaJson: Record<string, unknown> = {};
    if (Object.keys(filteredMeta).length) {
      let metaRow = await manager.findOne(ProjectMetaEntity, {
        where: { projectId: coreId },
      });
      const base = metaRow?.metaJson ?? {};
      metaJson = { ...base, ...filteredMeta };
      if (!metaRow) {
        metaRow = manager.create(ProjectMetaEntity, {
          projectId: coreId,
          metaJson,
        });
      } else {
        metaRow.metaJson = metaJson;
      }
      await manager.save(metaRow);
    } else {
      const metaRow = await manager.findOne(ProjectMetaEntity, {
        where: { projectId: coreId },
      });
      metaJson = metaRow?.metaJson ?? {};
    }

    const core = await manager.findOne(ProjectEntity, {
      where: { projectId: coreId },
    });
    if (!core) {
      throw new RpcException('Project not found after update.');
    }
    return { core, metaJson };
  }

  private async patchTaskCoreAndMeta(
    manager: EntityManager,
    coreId: number,
    tenantId: number,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const task = await manager.findOne(TaskEntity, {
      where: { taskId: coreId },
    });
    if (!task) {
      throw new RpcException('Task not found.');
    }
    if (task.tenantId !== tenantId) {
      throw new RpcException('Task does not belong to the specified tenant.');
    }

    if (Object.keys(filteredCore).length) {
      this.assignFilteredCoreProps(
        task as unknown as Record<string, unknown>,
        filteredCore,
        'task',
      );
      await manager.save(task);
    }

    let metaJson: Record<string, unknown> = {};
    if (Object.keys(filteredMeta).length) {
      let metaRow = await manager.findOne(TaskMetaEntity, {
        where: { taskId: coreId },
      });
      const base = metaRow?.metaJson ?? {};
      metaJson = { ...base, ...filteredMeta };
      if (!metaRow) {
        metaRow = manager.create(TaskMetaEntity, {
          taskId: coreId,
          metaJson,
        });
      } else {
        metaRow.metaJson = metaJson;
      }
      await manager.save(metaRow);
    } else {
      const metaRow = await manager.findOne(TaskMetaEntity, {
        where: { taskId: coreId },
      });
      metaJson = metaRow?.metaJson ?? {};
    }

    const core = await manager.findOne(TaskEntity, {
      where: { taskId: coreId },
    });
    if (!core) {
      throw new RpcException('Task not found after update.');
    }
    return { core, metaJson };
  }

  private async patchCustomerCoreAndMeta(
    manager: EntityManager,
    coreId: number,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const customer = await manager.findOne(CustomerEntity, {
      where: { customerId: coreId },
    });
    if (!customer) {
      throw new RpcException('Customer not found.');
    }

    if (Object.keys(filteredCore).length) {
      this.assignFilteredCoreProps(
        customer as unknown as Record<string, unknown>,
        filteredCore,
        'customer',
      );
      await manager.save(customer);
    }

    let metaJson: Record<string, unknown> = {};
    if (Object.keys(filteredMeta).length) {
      let metaRow = await manager.findOne(CustomerMetaEntity, {
        where: { customerId: coreId },
      });
      const base = metaRow?.metaJson ?? {};
      metaJson = { ...base, ...filteredMeta };
      if (!metaRow) {
        metaRow = manager.create(CustomerMetaEntity, {
          customerId: coreId,
          metaJson,
        });
      } else {
        metaRow.metaJson = metaJson;
      }
      await manager.save(metaRow);
    } else {
      const metaRow = await manager.findOne(CustomerMetaEntity, {
        where: { customerId: coreId },
      });
      metaJson = metaRow?.metaJson ?? {};
    }

    const core = await manager.findOne(CustomerEntity, {
      where: { customerId: coreId },
    });
    if (!core) {
      throw new RpcException('Customer not found after update.');
    }
    return { core, metaJson };
  }

  private async patchCustomerContactCoreAndMeta(
    manager: EntityManager,
    coreId: number,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
    customerId?: number,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const contact = await manager.findOne(CustomerContactInfoEntity, {
      where: { customerContactId: coreId },
    });
    if (!contact) {
      throw new RpcException('Customer contact not found.');
    }
    if (typeof customerId === 'number' && contact.customerId !== customerId) {
      throw new RpcException('customerId does not match the contact record.');
    }

    if (Object.keys(filteredCore).length) {
      this.assignFilteredCoreProps(
        contact as unknown as Record<string, unknown>,
        filteredCore,
        'customer_contact',
      );
      await manager.save(contact);
    }

    let metaJson: Record<string, unknown> = {};
    if (Object.keys(filteredMeta).length) {
      let metaRow = await manager.findOne(CustomerContactInfoMetaEntity, {
        where: { customerContactId: coreId },
      });
      const base = metaRow?.metaJson ?? {};
      metaJson = { ...base, ...filteredMeta };
      if (!metaRow) {
        metaRow = manager.create(CustomerContactInfoMetaEntity, {
          customerContactId: coreId,
          metaJson,
        });
      } else {
        metaRow.metaJson = metaJson;
      }
      await manager.save(metaRow);
    } else {
      const metaRow = await manager.findOne(CustomerContactInfoMetaEntity, {
        where: { customerContactId: coreId },
      });
      metaJson = metaRow?.metaJson ?? {};
    }

    const core = await manager.findOne(CustomerContactInfoEntity, {
      where: { customerContactId: coreId },
    });
    if (!core) {
      throw new RpcException('Customer contact not found after update.');
    }
    return { core, metaJson };
  }

  private async patchResourceCoreAndMeta(
    manager: EntityManager,
    coreId: number,
    tenantId: number,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const resource = await manager.findOne(ResourceEntity, {
      where: { resourceId: coreId },
    });
    if (!resource) {
      throw new RpcException('Resource not found.');
    }
    if (resource.tenantId !== tenantId) {
      throw new RpcException('Resource does not belong to the specified tenant.');
    }

    if (Object.keys(filteredCore).length) {
      this.assignFilteredCoreProps(
        resource as unknown as Record<string, unknown>,
        filteredCore,
        'resource',
      );
      await manager.save(resource);
    }

    let metaJson: Record<string, unknown> = {};
    if (Object.keys(filteredMeta).length) {
      let metaRow = await manager.findOne(ResourceMetaEntity, {
        where: { resourceId: coreId },
      });
      const base = metaRow?.metaJson ?? {};
      metaJson = { ...base, ...filteredMeta };
      if (!metaRow) {
        metaRow = manager.create(ResourceMetaEntity, {
          resourceId: coreId,
          metaJson,
        });
      } else {
        metaRow.metaJson = metaJson;
      }
      await manager.save(metaRow);
    } else {
      const metaRow = await manager.findOne(ResourceMetaEntity, {
        where: { resourceId: coreId },
      });
      metaJson = metaRow?.metaJson ?? {};
    }

    const core = await manager.findOne(ResourceEntity, {
      where: { resourceId: coreId },
    });
    if (!core) {
      throw new RpcException('Resource not found after update.');
    }
    return { core, metaJson };
  }

  /**
   * Retrieves the active configuration schema for a given tenant and object type.
   *
   * Includes runner-facing fields for unified list/detail/form (see `config-object-runner.ts`).
   *
   * @param tenantId - Tenant identifier used to scope configuration.
   * @param objectType - Logical object type key (e.g. `project`, `task`).
   * @returns The resolved configuration schema or `null` when none exists.
   */
  async getObjectSchema(
    tenantId: number | null | undefined,
    objectType: string,
  ): Promise<ConfigObjectRunnerSchemaView | null> {
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const where =
      effectiveTenantId === null
        ? { status: 'PUBLISHED' as const }
        : { tenantId: effectiveTenantId, status: 'PUBLISHED' as const };

    const templateSet = await this.templateSetRepository.findOne({
      where,
      order: { configTemplateSetId: 'ASC' },
    });

    if (!templateSet) {
      return null;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configTemplateSetId: templateSet.configTemplateSetId,
        objectType,
      },
    });

    if (!configObject) {
      return null;
    }

    const fields = await this.configObjectFieldRepository.find({
      where: {
        configObjectId: configObject.configObjectId,
      },
      order: {
        sectionKey: 'ASC',
        orderIndex: 'ASC',
      },
    });

    const fieldIds = fields.map((field) => field.configObjectFieldId);

    const rules = fieldIds.length
      ? await this.configObjectFieldRuleRepository.find({
          where: {
            configObjectFieldId: In(fieldIds),
          },
        })
      : [];

    const rulesByFieldId = new Map<number, ConfigObjectFieldRuleEntity[]>();
    for (const rule of rules) {
      const list = rulesByFieldId.get(rule.configObjectFieldId) ?? [];
      list.push(rule);
      rulesByFieldId.set(rule.configObjectFieldId, list);
    }

    const fieldViews: ConfigObjectFieldView[] = fields.map((field) => ({
      field,
      rules: (rulesByFieldId.get(field.configObjectFieldId) ?? []).map(
        (fieldRule) => ({ fieldRule }),
      ),
    }));

    return this.enrichSchemaViewWithRunner({
      configObject,
      fields: fieldViews,
    });
  }

  /**
   * Resolves a standalone instance from `config_custom_object_instances`.
   */
  private async resolveStandaloneObjectInstance(
    tenantId: number,
    objectType: string,
    instanceId: number,
  ): Promise<ConfigObjectResolvedStandaloneInstance | null> {
    const schema = await this.getObjectSchema(tenantId, objectType);

    if (!schema) {
      return null;
    }

    if (schema.configObject.bindingMode !== 'standalone') {
      throw new RpcException(
        'instanceId is only valid for standalone configurable objects.',
      );
    }

    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId: instanceId,
        tenantId,
        configObjectId: schema.configObject.configObjectId,
      },
    });

    if (!row) {
      return null;
    }

    const dynamicFields = this.mergeDynamicFieldsFromSource(
      schema,
      row.payload,
    );

    return {
      resolutionMode: 'standalone',
      objectType,
      instanceId: row.configCustomObjectInstanceId,
      tenantId,
      schema,
      dynamicFields,
      sections: [],
    };
  }

  /**
   * Resolves a configurable object instance by combining:
   * - SoR: core row + meta JSON, or
   * - Standalone: `config_custom_object_instances.payload`.
   *
   * @param tenantId - Tenant identifier used to scope configuration.
   * @param objectType - Logical object type key (e.g. `project`, `task`).
   * @param coreId - Primary key of the underlying core record (SoR only).
   * @param instanceId - Primary key of `config_custom_object_instances` (standalone only).
   * @returns A merged view, or `null` if unresolved.
   */
  async resolveObjectInstance(
    tenantId: number,
    objectType: string,
    coreId?: number,
    instanceId?: number,
  ): Promise<ConfigObjectResolvedInstance | null> {
    const hasCore = typeof coreId === 'number' && coreId >= 1;
    const hasInst = typeof instanceId === 'number' && instanceId >= 1;

    if (hasInst) {
      return this.resolveStandaloneObjectInstance(
        tenantId,
        objectType,
        instanceId as number,
      );
    }

    if (!hasCore) {
      throw new RpcException(
        'Provide coreId for SoR-backed objects or instanceId for standalone objects.',
      );
    }

    const schema = await this.getObjectSchema(tenantId, objectType);

    if (!schema) {
      return null;
    }

    if (schema.configObject.bindingMode === 'standalone') {
      throw new RpcException(
        'Standalone configurable objects require instanceId, not coreId.',
      );
    }

    if (schema.configObject.bindingMode === 'system_table') {
      throw new RpcException(
        CONFIG_OBJECT_SYSTEM_TABLE_RESOLVE_FORBIDDEN_MESSAGE,
      );
    }

    const { coreEntity, metaJson } = await this.loadCoreAndMeta(
      objectType,
      coreId as number,
    );

    if (!coreEntity) {
      return null;
    }

    const dynamicFields = this.mergeDynamicFieldsFromSource(
      schema,
      metaJson as Record<string, unknown> | null | undefined,
    );

    const resolved: ConfigObjectResolvedSorInstance = {
      resolutionMode: 'sor_bound',
      objectType,
      coreId: coreId as number,
      tenantId,
      schema,
      core: coreEntity,
      dynamicFields,
      sections: [],
    };

    return resolved;
  }

  /**
   * Writes an audit log entry for a configuration change.
   *
   * @param tenantId - Tenant that owns the configuration.
   * @param entityType - Configuration entity type (e.g. `object`, `field`, `view`).
   * @param entityId - Primary key of the configuration entity.
   * @param action - Type of change performed.
   * @param changedBy - Tenant user identifier that performed the change.
   * @param oldValue - Previous serialized value (if applicable).
   * @param newValue - New serialized value (if applicable).
   */
  async logConfigChange(
    tenantId: number | null | undefined,
    entityType: string,
    entityId: number,
    action: 'create' | 'update' | 'delete',
    changedBy: number,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
  ): Promise<void> {
    const normalizedTenantId =
      typeof tenantId === 'number' && tenantId > 0 ? tenantId : null;

    const audit = this.configAuditLogRepository.create({
      tenantId: normalizedTenantId,
      entityType,
      entityId,
      action,
      changedBy,
      oldValue,
      newValue,
    });

    await this.configAuditLogRepository.save(audit);
  }

  /**
   * Lists configuration objects for a tenant and optional template set.
   *
   * @param tenantId - Tenant identifier used to scope configuration.
   * @param configTemplateSetId - Optional template set identifier to filter by.
   * @returns List of configuration objects.
   */
  async listConfigObjects(
    tenantId: number | null | undefined,
    configTemplateSetId?: number | string | null,
    status?: ConfigObjectStatus,
    bindingMode?: ConfigObjectBindingMode,
  ): Promise<ConfigObjectEntity[]> {
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const templateSetFilterId =
      this.normalizeOptionalPositiveInt(configTemplateSetId);

    const where =
      effectiveTenantId === null
        ? templateSetFilterId
          ? { configTemplateSetId: templateSetFilterId }
          : {}
        : {
            tenantId: effectiveTenantId,
            ...(templateSetFilterId
              ? { configTemplateSetId: templateSetFilterId }
              : {}),
          };

    const templateSets = await this.templateSetRepository.find({
      where,
      order: {
        configTemplateSetId: 'ASC',
      },
    });

    if (!templateSets.length) {
      return [];
    }

    const templateSetIds = templateSets.map((set) => set.configTemplateSetId);

    return this.configObjectRepository.find({
      where: {
        configTemplateSetId: In(templateSetIds),
        ...(status ? { status } : {}),
        ...(bindingMode ? { bindingMode } : {}),
      },
      order: {
        configObjectId: 'ASC',
      },
    });
  }

  /**
   * Creates a new configuration object within a template set and logs the change.
   */
  async createConfigObject(params: {
    tenantId: number | null | undefined;
    configTemplateSetId: number;
    createdBy: number;
    objectType: string;
    sorTableName?: string | null;
    bindingMode?: ConfigObjectBindingMode;
    displayName: string;
    description?: string | null;
    status?: ConfigObjectStatus;
  }): Promise<ConfigObjectEntity> {
    const {
      tenantId,
      configTemplateSetId,
      createdBy,
      objectType,
      sorTableName,
      bindingMode,
      displayName,
      description,
      status,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Template set not found for tenant when creating config object.',
      );
    }

    const existing = await this.configObjectRepository.findOne({
      where: {
        configTemplateSetId,
        objectType,
      },
    });

    if (existing) {
      throw new RpcException(
        `Config object with type "${objectType}" already exists in template set.`,
      );
    }

    const effectiveStatus: ConfigObjectStatus =
      typeof status === 'string' ? status : 'DRAFT';

    const { bindingMode: resolvedMode, sorTableName: resolvedSor } =
      this.normalizeConfigObjectBinding(bindingMode, sorTableName);

    const configObject = this.configObjectRepository.create({
      configTemplateSetId,
      objectType,
      bindingMode: resolvedMode,
      sorTableName: resolvedSor,
      displayName,
      description: typeof description === 'undefined' ? null : description,
      status: effectiveStatus,
    });

    const saved: ConfigObjectEntity =
      await this.configObjectRepository.save(configObject);

    await this.logConfigChange(
      effectiveTenantId,
      'object',
      saved.configObjectId,
      'create',
      createdBy,
      null,
      {
        objectType: saved.objectType,
        bindingMode: saved.bindingMode,
        sorTableName: saved.sorTableName,
        displayName: saved.displayName,
        description: saved.description ?? null,
        status: saved.status,
        configTemplateSetId: saved.configTemplateSetId,
      },
    );

    return saved;
  }

  /**
   * Updates an existing configuration object and logs the change.
   */
  async updateConfigObject(params: {
    tenantId: number | null | undefined;
    configObjectId: number;
    updatedBy: number;
    displayName?: string;
    description?: string | null;
    status?: ConfigObjectStatus;
    bindingMode?: ConfigObjectBindingMode;
    sorTableName?: string | null;
  }): Promise<ConfigObjectEntity> {
    const {
      tenantId,
      configObjectId,
      updatedBy,
      displayName,
      description,
      status,
      bindingMode,
      sorTableName,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.configObjectRepository.findOne({
      where: {
        configObjectId,
      },
    });

    if (!existing) {
      throw new RpcException('Config object not found.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        existing.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      displayName: existing.displayName,
      description: existing.description ?? null,
      status: existing.status,
      bindingMode: existing.bindingMode,
      sorTableName: existing.sorTableName,
    };

    const nextMode =
      typeof bindingMode === 'string' ? bindingMode : existing.bindingMode;
    let nextSor: string | null;
    if (typeof sorTableName !== 'undefined') {
      const trimmed = sorTableName === null ? '' : String(sorTableName).trim();
      nextSor = trimmed.length ? trimmed : null;
    } else {
      nextSor = existing.sorTableName;
    }
    if (nextMode === 'standalone') {
      nextSor = null;
    } else if (!nextSor) {
      throw new RpcException(
        'sor_table_name is required when binding_mode is sor_bound or system_table.',
      );
    }

    if (
      nextMode === 'system_table' &&
      existing.bindingMode !== 'system_table'
    ) {
      const fieldCount = await this.configObjectFieldRepository.count({
        where: { configObjectId: existing.configObjectId },
      });
      if (fieldCount > 0) {
        throw new RpcException(
          'Cannot set binding_mode to system_table while config_object_fields exist; delete those fields first.',
        );
      }
    }

    if (typeof displayName === 'string') {
      existing.displayName = displayName;
    }
    if (typeof description !== 'undefined') {
      existing.description = description;
    }
    if (typeof status === 'string') {
      existing.status = status as ConfigObjectStatus;
    }
    existing.bindingMode = nextMode;
    existing.sorTableName = nextSor;

    const saved = await this.configObjectRepository.save(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'object',
      saved.configObjectId,
      'update',
      updatedBy,
      oldValue,
      {
        displayName: saved.displayName,
        description: saved.description ?? null,
        status: saved.status,
        bindingMode: saved.bindingMode,
        sorTableName: saved.sorTableName,
      },
    );

    return saved;
  }

  /**
   * Deletes a configuration object and logs the change.
   */
  async deleteConfigObject(params: {
    tenantId: number | null | undefined;
    configObjectId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectId, deletedBy } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.configObjectRepository.findOne({
      where: {
        configObjectId,
      },
    });

    if (!existing) {
      // Idempotent delete.
      return;
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        existing.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      objectType: existing.objectType,
      bindingMode: existing.bindingMode,
      sorTableName: existing.sorTableName,
      displayName: existing.displayName,
      description: existing.description ?? null,
      configTemplateSetId: existing.configTemplateSetId,
    };

    await this.configObjectRepository.remove(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'object',
      configObjectId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Lists standalone instances for a tenant and config object definition.
   */
  async listCustomObjectInstances(params: {
    tenantId: number;
    configObjectId: number;
    status?: ConfigCustomObjectInstanceStatus;
  }): Promise<ConfigCustomObjectInstanceEntity[]> {
    const { tenantId, configObjectId, status } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    if (effectiveTenantId === null) {
      throw new RpcException('tenantId is required.');
    }

    await this.getStandaloneConfigObjectForTenant(
      configObjectId,
      effectiveTenantId,
    );

    return this.customObjectInstanceRepository.find({
      where: {
        tenantId: effectiveTenantId,
        configObjectId,
        ...(status ? { status } : {}),
      },
      order: { configCustomObjectInstanceId: 'ASC' },
    });
  }

  /**
   * Returns one standalone instance or null if not found / out of scope.
   */
  async getCustomObjectInstance(params: {
    tenantId: number;
    configCustomObjectInstanceId: number;
  }): Promise<ConfigCustomObjectInstanceEntity | null> {
    const { tenantId, configCustomObjectInstanceId } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    if (effectiveTenantId === null) {
      throw new RpcException('tenantId is required.');
    }

    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId,
        tenantId: effectiveTenantId,
      },
    });

    if (!row) {
      return null;
    }

    await this.getStandaloneConfigObjectForTenant(
      row.configObjectId,
      effectiveTenantId,
    );

    return row;
  }

  /**
   * Creates a standalone instance row.
   */
  async createCustomObjectInstance(params: {
    tenantId: number;
    configObjectId: number;
    createdBy: number;
    payload?: Record<string, unknown>;
    status?: ConfigCustomObjectInstanceStatus;
  }): Promise<ConfigCustomObjectInstanceEntity> {
    const { tenantId, configObjectId, createdBy, payload, status } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    if (effectiveTenantId === null) {
      throw new RpcException('tenantId is required.');
    }

    const configObject = await this.getStandaloneConfigObjectForTenant(
      configObjectId,
      effectiveTenantId,
    );

    const nextPayload = this.normalizeCustomInstancePayload(payload);
    const nextStatus: ConfigCustomObjectInstanceStatus =
      typeof status === 'string' ? status : 'DRAFT';

    const entity = this.customObjectInstanceRepository.create({
      tenantId: effectiveTenantId,
      configObjectId: configObject.configObjectId,
      payload: nextPayload,
      status: nextStatus,
      createdBy,
      updatedBy: null,
    });

    const saved = await this.customObjectInstanceRepository.save(entity);

    await this.logConfigChange(
      effectiveTenantId,
      'custom_object_instance',
      saved.configCustomObjectInstanceId,
      'create',
      createdBy,
      null,
      {
        configObjectId: saved.configObjectId,
        tenantId: saved.tenantId,
        status: saved.status,
        payload: saved.payload,
      },
    );

    return saved;
  }

  /**
   * Updates payload and/or status for a standalone instance.
   */
  async updateCustomObjectInstance(params: {
    tenantId: number;
    configCustomObjectInstanceId: number;
    updatedBy: number;
    payload?: Record<string, unknown>;
    status?: ConfigCustomObjectInstanceStatus;
  }): Promise<ConfigCustomObjectInstanceEntity> {
    const {
      tenantId,
      configCustomObjectInstanceId,
      updatedBy,
      payload,
      status,
    } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    if (effectiveTenantId === null) {
      throw new RpcException('tenantId is required.');
    }

    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId,
        tenantId: effectiveTenantId,
      },
    });

    if (!row) {
      throw new RpcException('Custom object instance not found.');
    }

    await this.getStandaloneConfigObjectForTenant(
      row.configObjectId,
      effectiveTenantId,
    );

    const oldValue = {
      status: row.status,
      payload: row.payload,
    };

    if (typeof payload !== 'undefined') {
      row.payload = this.normalizeCustomInstancePayload(payload);
    }
    if (typeof status === 'string') {
      row.status = status;
    }

    row.updatedBy = updatedBy;

    const saved = await this.customObjectInstanceRepository.save(row);

    await this.logConfigChange(
      effectiveTenantId,
      'custom_object_instance',
      saved.configCustomObjectInstanceId,
      'update',
      updatedBy,
      oldValue,
      {
        status: saved.status,
        payload: saved.payload,
      },
    );

    return saved;
  }

  /**
   * Deletes a standalone instance (idempotent when already removed).
   */
  async deleteCustomObjectInstance(params: {
    tenantId: number;
    configCustomObjectInstanceId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configCustomObjectInstanceId, deletedBy } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    if (effectiveTenantId === null) {
      throw new RpcException('tenantId is required.');
    }

    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId,
        tenantId: effectiveTenantId,
      },
    });

    if (!row) {
      return;
    }

    await this.getStandaloneConfigObjectForTenant(
      row.configObjectId,
      effectiveTenantId,
    );

    const oldValue = {
      configObjectId: row.configObjectId,
      tenantId: row.tenantId,
      status: row.status,
      payload: row.payload,
    };

    await this.customObjectInstanceRepository.remove(row);

    await this.logConfigChange(
      effectiveTenantId,
      'custom_object_instance',
      configCustomObjectInstanceId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Lists configuration fields for a given config object, scoped to tenant.
   */
  async listConfigFields(params: {
    tenantId: number | null | undefined;
    configObjectId: number;
  }): Promise<ConfigObjectFieldEntity[]> {
    const { tenantId, configObjectId } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId,
      },
    });

    if (!configObject) {
      return [];
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    if (configObject.bindingMode === 'system_table') {
      return [];
    }

    return this.configObjectFieldRepository.find({
      where: {
        configObjectId,
      },
      order: {
        sectionKey: 'ASC',
        orderIndex: 'ASC',
      },
    });
  }

  /**
   * Creates a new configuration field and logs the change.
   */
  async createConfigField(params: {
    tenantId: number | null | undefined;
    configObjectId: number;
    createdBy: number;
    fieldKey: string;
    label: string;
    description?: string | null;
    fieldType: string;
    validationJson?: Record<string, unknown> | null;
    defaultValue?: unknown | null;
    isRequired?: boolean;
    isSystem?: boolean;
    orderIndex?: number;
    sectionKey?: string | null;
  }): Promise<ConfigObjectFieldEntity> {
    const {
      tenantId,
      configObjectId,
      createdBy,
      fieldKey,
      label,
      description,
      fieldType,
      validationJson,
      defaultValue,
      isRequired,
      isSystem,
      orderIndex,
      sectionKey,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    this.assertConfigObjectAllowsDesignerFields(configObject);

    const existing = await this.configObjectFieldRepository.findOne({
      where: {
        configObjectId,
        fieldKey,
      },
    });

    if (existing) {
      throw new RpcException(
        `Config field with key "${fieldKey}" already exists on object.`,
      );
    }

    const field = this.configObjectFieldRepository.create({
      configObjectId,
      fieldKey,
      label,
      description: typeof description === 'undefined' ? null : description,
      fieldType,
      validationJson:
        typeof validationJson === 'undefined' ? null : validationJson,
      defaultValue: typeof defaultValue === 'undefined' ? null : defaultValue,
      isRequired: typeof isRequired === 'boolean' ? isRequired : false,
      isSystem: typeof isSystem === 'boolean' ? isSystem : false,
      orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
      sectionKey: typeof sectionKey === 'undefined' ? null : sectionKey,
      createdBy,
      updatedBy: createdBy,
    });

    const saved = await this.configObjectFieldRepository.save(field);

    await this.logConfigChange(
      effectiveTenantId,
      'field',
      saved.configObjectFieldId,
      'create',
      createdBy,
      null,
      {
        configObjectId: saved.configObjectId,
        fieldKey: saved.fieldKey,
        label: saved.label,
        description: saved.description ?? null,
        fieldType: saved.fieldType,
        validationJson: saved.validationJson ?? null,
        defaultValue: saved.defaultValue ?? null,
        isRequired: saved.isRequired,
        isSystem: saved.isSystem,
        orderIndex: saved.orderIndex,
        sectionKey: saved.sectionKey ?? null,
      },
    );

    return saved;
  }

  /**
   * Updates an existing configuration field and logs the change.
   */
  async updateConfigField(params: {
    tenantId: number | null | undefined;
    configObjectFieldId: number;
    updatedBy: number;
    label?: string;
    description?: string | null;
    fieldType?: string;
    validationJson?: Record<string, unknown> | null;
    defaultValue?: unknown | null;
    isRequired?: boolean;
    isSystem?: boolean;
    orderIndex?: number;
    sectionKey?: string | null;
  }): Promise<ConfigObjectFieldEntity> {
    const {
      tenantId,
      configObjectFieldId,
      updatedBy,
      label,
      description,
      fieldType,
      validationJson,
      defaultValue,
      isRequired,
      isSystem,
      orderIndex,
      sectionKey,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.configObjectFieldRepository.findOne({
      where: {
        configObjectFieldId,
      },
    });

    if (!existing) {
      throw new RpcException('Config field not found.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: existing.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for field.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    this.assertConfigObjectAllowsDesignerFields(configObject);

    const oldValue = {
      label: existing.label,
      description: existing.description ?? null,
      fieldType: existing.fieldType,
      validationJson: existing.validationJson ?? null,
      defaultValue: existing.defaultValue ?? null,
      isRequired: existing.isRequired,
      isSystem: existing.isSystem,
      orderIndex: existing.orderIndex,
      sectionKey: existing.sectionKey ?? null,
    };

    if (typeof label === 'string') {
      existing.label = label;
    }
    if (typeof description !== 'undefined') {
      existing.description = description;
    }
    if (typeof fieldType === 'string') {
      existing.fieldType = fieldType;
    }
    if (typeof validationJson !== 'undefined') {
      existing.validationJson = validationJson;
    }
    if (typeof defaultValue !== 'undefined') {
      existing.defaultValue = defaultValue;
    }
    if (typeof isRequired === 'boolean') {
      existing.isRequired = isRequired;
    }
    if (typeof isSystem === 'boolean') {
      existing.isSystem = isSystem;
    }
    if (typeof orderIndex === 'number') {
      existing.orderIndex = orderIndex;
    }
    if (typeof sectionKey !== 'undefined') {
      existing.sectionKey = sectionKey;
    }
    existing.updatedBy = updatedBy;

    const saved = await this.configObjectFieldRepository.save(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'field',
      saved.configObjectFieldId,
      'update',
      updatedBy,
      oldValue,
      {
        label: saved.label,
        description: saved.description ?? null,
        fieldType: saved.fieldType,
        validationJson: saved.validationJson ?? null,
        defaultValue: saved.defaultValue ?? null,
        isRequired: saved.isRequired,
        isSystem: saved.isSystem,
        orderIndex: saved.orderIndex,
        sectionKey: saved.sectionKey ?? null,
      },
    );

    return saved;
  }

  /**
   * Deletes a configuration field and logs the change.
   */
  async deleteConfigField(params: {
    tenantId: number | null | undefined;
    configObjectFieldId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectFieldId, deletedBy } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.configObjectFieldRepository.findOne({
      where: {
        configObjectFieldId,
      },
    });

    if (!existing) {
      // Idempotent delete.
      return;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: existing.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for field.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      configObjectId: existing.configObjectId,
      fieldKey: existing.fieldKey,
      label: existing.label,
      description: existing.description ?? null,
      fieldType: existing.fieldType,
      validationJson: existing.validationJson ?? null,
      defaultValue: existing.defaultValue ?? null,
      isRequired: existing.isRequired,
      isSystem: existing.isSystem,
      orderIndex: existing.orderIndex,
      sectionKey: existing.sectionKey ?? null,
    };

    await this.configObjectFieldRepository.remove(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'field',
      configObjectFieldId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Retrieves lifecycle states for a given configurable object type.
   *
   * @param objectType - Logical object type key (e.g. `project`, `task`).
   * @returns List of lifecycle state records ordered by `order_index`.
   */
  async getLifecyclesForObjectType(
    objectType: string,
  ): Promise<ConfigObjectLifecycleEntity[]> {
    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType,
      },
    });

    if (!configObject) {
      return [];
    }

    return this.lifecycleRepository.find({
      where: {
        configObjectId: configObject.configObjectId,
      },
      order: {
        orderIndex: 'ASC',
      },
    });
  }

  /**
   * Resolves a config object by objectType and tenant scope.
   */
  private async getConfigObjectForTenantScopeByObjectType(
    tenantId: number | null | undefined,
    objectType: string,
  ): Promise<ConfigObjectEntity> {
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const configObject = await this.configObjectRepository.findOne({
      where: { objectType },
      order: { configObjectId: 'ASC' },
    });

    if (!configObject) {
      throw new RpcException(
        `No config object found for object type "${objectType}".`,
      );
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    return configObject;
  }

  /**
   * Lists status mappings for a configurable object type in tenant scope.
   */
  async listConfigStatusMappings(params: {
    tenantId: number | null | undefined;
    objectType: string;
  }): Promise<ConfigObjectStatusMappingEntity[]> {
    const configObject = await this.getConfigObjectForTenantScopeByObjectType(
      params.tenantId,
      params.objectType,
    );

    return this.configObjectStatusMappingRepository.find({
      where: { configObjectId: configObject.configObjectId },
      order: { orderIndex: 'ASC', configObjectStatusMappingId: 'ASC' },
    });
  }

  /**
   * Creates a status mapping row for lifecycle to persisted status alignment.
   */
  async createConfigStatusMapping(params: {
    tenantId: number | null | undefined;
    objectType: string;
    createdBy: number;
    stateKey: string;
    statusSource: ConfigObjectStatusSource;
    statusValue: string;
    isDefault?: boolean;
    isTerminal?: boolean;
    orderIndex?: number;
  }): Promise<ConfigObjectStatusMappingEntity> {
    const effectiveTenantId = this.getEffectiveTenantId(params.tenantId);
    const configObject = await this.getConfigObjectForTenantScopeByObjectType(
      params.tenantId,
      params.objectType,
    );

    const lifecycle = await this.lifecycleRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        stateKey: params.stateKey,
      },
    });
    if (!lifecycle) {
      throw new RpcException(
        `Lifecycle state "${params.stateKey}" does not exist for object type "${params.objectType}".`,
      );
    }

    const mapping = this.configObjectStatusMappingRepository.create({
      configObjectId: configObject.configObjectId,
      stateKey: params.stateKey,
      statusSource: params.statusSource,
      statusValue: String(params.statusValue),
      isDefault: params.isDefault ?? false,
      isTerminal: params.isTerminal ?? false,
      orderIndex: typeof params.orderIndex === 'number' ? params.orderIndex : 0,
    });
    const saved = await this.configObjectStatusMappingRepository.save(mapping);

    await this.logConfigChange(
      effectiveTenantId,
      'status_mapping',
      saved.configObjectStatusMappingId,
      'create',
      params.createdBy,
      null,
      {
        configObjectId: saved.configObjectId,
        stateKey: saved.stateKey,
        statusSource: saved.statusSource,
        statusValue: saved.statusValue,
        isDefault: saved.isDefault,
        isTerminal: saved.isTerminal,
        orderIndex: saved.orderIndex,
      },
    );

    return saved;
  }

  /**
   * Updates a status mapping row.
   */
  async updateConfigStatusMapping(params: {
    tenantId: number | null | undefined;
    configObjectStatusMappingId: number;
    updatedBy: number;
    stateKey?: string;
    statusSource?: ConfigObjectStatusSource;
    statusValue?: string;
    isDefault?: boolean;
    isTerminal?: boolean;
    orderIndex?: number;
  }): Promise<ConfigObjectStatusMappingEntity> {
    const effectiveTenantId = this.getEffectiveTenantId(params.tenantId);
    const mapping = await this.configObjectStatusMappingRepository.findOne({
      where: { configObjectStatusMappingId: params.configObjectStatusMappingId },
    });

    if (!mapping) {
      throw new RpcException('Config status mapping not found.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: mapping.configObjectId },
    });
    if (!configObject) {
      throw new RpcException('Config object not found for status mapping.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });
    if (!templateSet) {
      throw new RpcException(
        'Status mapping does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      stateKey: mapping.stateKey,
      statusSource: mapping.statusSource,
      statusValue: mapping.statusValue,
      isDefault: mapping.isDefault,
      isTerminal: mapping.isTerminal,
      orderIndex: mapping.orderIndex,
    };

    if (typeof params.stateKey === 'string') {
      const lifecycle = await this.lifecycleRepository.findOne({
        where: {
          configObjectId: mapping.configObjectId,
          stateKey: params.stateKey,
        },
      });
      if (!lifecycle) {
        throw new RpcException(
          `Lifecycle state "${params.stateKey}" does not exist for this object.`,
        );
      }
      mapping.stateKey = params.stateKey;
    }
    if (typeof params.statusSource === 'string') {
      mapping.statusSource = params.statusSource;
    }
    if (typeof params.statusValue === 'string') {
      mapping.statusValue = params.statusValue;
    }
    if (typeof params.isDefault === 'boolean') {
      mapping.isDefault = params.isDefault;
    }
    if (typeof params.isTerminal === 'boolean') {
      mapping.isTerminal = params.isTerminal;
    }
    if (typeof params.orderIndex === 'number') {
      mapping.orderIndex = params.orderIndex;
    }

    const saved = await this.configObjectStatusMappingRepository.save(mapping);

    await this.logConfigChange(
      effectiveTenantId,
      'status_mapping',
      saved.configObjectStatusMappingId,
      'update',
      params.updatedBy,
      oldValue,
      {
        stateKey: saved.stateKey,
        statusSource: saved.statusSource,
        statusValue: saved.statusValue,
        isDefault: saved.isDefault,
        isTerminal: saved.isTerminal,
        orderIndex: saved.orderIndex,
      },
    );

    return saved;
  }

  /**
   * Deletes a status mapping row.
   */
  async deleteConfigStatusMapping(params: {
    tenantId: number | null | undefined;
    configObjectStatusMappingId: number;
    deletedBy: number;
  }): Promise<void> {
    const effectiveTenantId = this.getEffectiveTenantId(params.tenantId);
    const mapping = await this.configObjectStatusMappingRepository.findOne({
      where: { configObjectStatusMappingId: params.configObjectStatusMappingId },
    });

    if (!mapping) {
      return;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: mapping.configObjectId },
    });
    if (!configObject) {
      throw new RpcException('Config object not found for status mapping.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });
    if (!templateSet) {
      throw new RpcException(
        'Status mapping does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      configObjectId: mapping.configObjectId,
      stateKey: mapping.stateKey,
      statusSource: mapping.statusSource,
      statusValue: mapping.statusValue,
      isDefault: mapping.isDefault,
      isTerminal: mapping.isTerminal,
      orderIndex: mapping.orderIndex,
    };

    await this.configObjectStatusMappingRepository.remove(mapping);

    await this.logConfigChange(
      effectiveTenantId,
      'status_mapping',
      params.configObjectStatusMappingId,
      'delete',
      params.deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Resolves lifecycle state key for a persisted status value.
   */
  async resolveLifecycleStateFromStatus(params: {
    tenantId: number | null | undefined;
    objectType: string;
    statusSource: ConfigObjectStatusSource;
    statusValue: string;
  }): Promise<{
    objectType: string;
    statusSource: ConfigObjectStatusSource;
    statusValue: string;
    stateKey: string | null;
  }> {
    const configObject = await this.getConfigObjectForTenantScopeByObjectType(
      params.tenantId,
      params.objectType,
    );

    const mapping = await this.configObjectStatusMappingRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        statusSource: params.statusSource,
        statusValue: String(params.statusValue),
      },
      order: { isDefault: 'DESC', orderIndex: 'ASC' },
    });

    return {
      objectType: params.objectType,
      statusSource: params.statusSource,
      statusValue: String(params.statusValue),
      stateKey: mapping?.stateKey ?? null,
    };
  }

  /**
   * Resolves persisted status value for a lifecycle state.
   */
  async resolveStatusFromLifecycleState(params: {
    tenantId: number | null | undefined;
    objectType: string;
    stateKey: string;
    statusSource?: ConfigObjectStatusSource;
  }): Promise<{
    objectType: string;
    stateKey: string;
    statusSource: ConfigObjectStatusSource | null;
    statusValue: string | null;
  }> {
    const configObject = await this.getConfigObjectForTenantScopeByObjectType(
      params.tenantId,
      params.objectType,
    );

    const where: {
      configObjectId: number;
      stateKey: string;
      statusSource?: ConfigObjectStatusSource;
    } = {
      configObjectId: configObject.configObjectId,
      stateKey: params.stateKey,
    };
    if (typeof params.statusSource === 'string') {
      where.statusSource = params.statusSource;
    }

    const mapping = await this.configObjectStatusMappingRepository.findOne({
      where,
      order: { isDefault: 'DESC', orderIndex: 'ASC' },
    });

    return {
      objectType: params.objectType,
      stateKey: params.stateKey,
      statusSource: mapping?.statusSource ?? null,
      statusValue: mapping?.statusValue ?? null,
    };
  }

  /**
   * Retrieves relationship metadata where the given type is the
   * source (`from_object_type`).
   *
   * @param objectType - Logical object type key.
   * @returns List of relationship definitions.
   */
  async getRelationshipsForObjectType(
    objectType: string,
  ): Promise<ConfigObjectRelationshipEntity[]> {
    return this.relationshipRepository.find({
      where: {
        fromObjectType: objectType,
        isActive: true,
      },
    });
  }

  /**
   * Creates a new relationship metadata entry between configurable object types.
   */
  async createConfigRelationship(params: {
    tenantId: number;
    fromObjectType: string;
    toObjectType: string;
    relationshipKey: string;
    displayName?: string;
    cardinality: 'one_to_many' | 'many_to_one' | 'many_to_many';
    queryConfig?: Record<string, unknown>;
    createdBy: number;
    isActive?: boolean;
  }): Promise<ConfigObjectRelationshipEntity> {
    const {
      tenantId,
      fromObjectType,
      toObjectType,
      relationshipKey,
      cardinality,
      createdBy,
      isActive,
    } = params;

    const displayName =
      typeof params.displayName === 'string' &&
      params.displayName.trim().length > 0
        ? params.displayName.trim()
        : relationshipKey;
    const queryConfig =
      params.queryConfig != null &&
      typeof params.queryConfig === 'object' &&
      !Array.isArray(params.queryConfig)
        ? params.queryConfig
        : {};

    const existing = await this.relationshipRepository.findOne({
      where: {
        fromObjectType,
        relationshipKey,
      },
    });

    if (existing) {
      throw new RpcException(
        `Relationship with key "${relationshipKey}" already exists for "${fromObjectType}".`,
      );
    }

    const rel = this.relationshipRepository.create({
      fromObjectType,
      toObjectType,
      relationshipKey,
      displayName,
      cardinality,
      queryConfig,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    const saved = await this.relationshipRepository.save(rel);

    await this.logConfigChange(
      tenantId,
      'relationship',
      saved.configObjectRelationshipId,
      'create',
      createdBy,
      null,
      {
        fromObjectType: saved.fromObjectType,
        toObjectType: saved.toObjectType,
        relationshipKey: saved.relationshipKey,
        displayName: saved.displayName,
        cardinality: saved.cardinality,
        queryConfig: saved.queryConfig,
        isActive: saved.isActive,
      },
    );

    return saved;
  }

  /**
   * Updates an existing relationship metadata entry.
   */
  async updateConfigRelationship(params: {
    tenantId: number;
    configObjectRelationshipId: number;
    updatedBy: number;
    displayName?: string;
    cardinality?: 'one_to_many' | 'many_to_one' | 'many_to_many';
    queryConfig?: Record<string, unknown>;
    isActive?: boolean;
  }): Promise<ConfigObjectRelationshipEntity> {
    const {
      tenantId,
      configObjectRelationshipId,
      updatedBy,
      displayName,
      cardinality,
      queryConfig,
      isActive,
    } = params;

    const rel = await this.relationshipRepository.findOne({
      where: { configObjectRelationshipId },
    });

    if (!rel) {
      throw new RpcException('Config relationship not found.');
    }

    const oldValue = {
      displayName: rel.displayName,
      cardinality: rel.cardinality,
      queryConfig: rel.queryConfig,
      isActive: rel.isActive,
    };

    if (typeof displayName === 'string') {
      rel.displayName = displayName;
    }
    if (typeof cardinality === 'string') {
      rel.cardinality = cardinality;
    }
    if (typeof queryConfig !== 'undefined') {
      rel.queryConfig = queryConfig;
    }
    if (typeof isActive === 'boolean') {
      rel.isActive = isActive;
    }

    const saved = await this.relationshipRepository.save(rel);

    await this.logConfigChange(
      tenantId,
      'relationship',
      saved.configObjectRelationshipId,
      'update',
      updatedBy,
      oldValue,
      {
        displayName: saved.displayName,
        cardinality: saved.cardinality,
        queryConfig: saved.queryConfig,
        isActive: saved.isActive,
      },
    );

    return saved;
  }

  /**
   * Deletes a relationship metadata entry.
   */
  async deleteConfigRelationship(params: {
    tenantId: number;
    configObjectRelationshipId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectRelationshipId, deletedBy } = params;

    const rel = await this.relationshipRepository.findOne({
      where: { configObjectRelationshipId },
    });

    if (!rel) {
      return;
    }

    const oldValue = {
      fromObjectType: rel.fromObjectType,
      toObjectType: rel.toObjectType,
      relationshipKey: rel.relationshipKey,
      displayName: rel.displayName,
      cardinality: rel.cardinality,
      queryConfig: rel.queryConfig,
      isActive: rel.isActive,
    };

    await this.relationshipRepository.remove(rel);

    await this.logConfigChange(
      tenantId,
      'relationship',
      configObjectRelationshipId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Resolves related objects for a given configurable object instance using
   * relationship metadata and simple query_config conventions.
   *
   * Currently supports:
   * - Simple foreign-key relationships (sor_table + foreign_key + local_key).
   * - Many-to-many via join_table (join_table + join_local_key + join_foreign_key).
   * - Indirect "via" relationships used by seeded project relationships.
   */
  async getRelatedObjects(
    tenantId: number,
    objectType: string,
    coreId: number,
  ): Promise<RelatedObjectsResult> {
    // Ensure the "from" object exists and belongs to the tenant when
    // tenant-aware entities are used.
    await this.assertFromObjectBelongsToTenant(tenantId, objectType, coreId);

    const relationships = await this.getRelationshipsForObjectType(objectType);

    if (!relationships.length) {
      return {
        objectType,
        coreId,
        relationships: {},
      };
    }

    const result: RelatedObjectsResult = {
      objectType,
      coreId,
      relationships: {},
    };

    const manager = this.configObjectRepository.manager;

    const isSafeIdentifier = (value: unknown): boolean =>
      typeof value === 'string' && /^[a-zA-Z0-9_]+$/.test(value);

    const id = (value: unknown): string => {
      if (!isSafeIdentifier(value)) {
        throw new RpcException(
          'Invalid relationship configuration identifier.',
        );
      }
      return String(value);
    };

    for (const rel of relationships) {
      const key = rel.relationshipKey;
      const cfg: Record<string, unknown> = rel.queryConfig || {};

      try {
        // 1) Simple FK relationship: { sor_table, foreign_key, local_key }
        if (
          cfg.sor_table &&
          cfg.foreign_key &&
          cfg.local_key &&
          !cfg.join_table &&
          !cfg.via
        ) {
          const sorTable = id(cfg.sor_table);
          const foreignKey = id(cfg.foreign_key);
          const localKey = id(cfg.local_key);

          if (localKey !== foreignKey) {
            // For now we only support simple equality on the same key.
            result.relationships[key] = [];
            continue;
          }

          const rows = await manager.query(
            `SELECT * FROM ${sorTable} WHERE ${foreignKey} = ?`,
            [coreId],
          );
          result.relationships[key] = rows;
          continue;
        }

        // 2) Many-to-many via join table: { join_table, join_local_key, join_foreign_key, target_table }
        if (
          cfg.join_table &&
          cfg.join_local_key &&
          cfg.join_foreign_key &&
          cfg.target_table
        ) {
          const joinTable = id(cfg.join_table);
          const joinLocalKey = id(cfg.join_local_key);
          const joinForeignKey = id(cfg.join_foreign_key);
          const targetTable = id(cfg.target_table);
          const targetPrimaryKey = isSafeIdentifier(cfg.target_primary_key)
            ? id(cfg.target_primary_key)
            : joinForeignKey;

          const idRows: Array<{ id: number }> = await manager.query(
            `SELECT DISTINCT ${joinForeignKey} AS id
             FROM ${joinTable}
            WHERE ${joinLocalKey} = ?`,
            [coreId],
          );
          const ids = idRows.map((r) => r.id);
          if (!ids.length) {
            result.relationships[key] = [];
            continue;
          }

          const placeholders = ids.map(() => '?').join(',');
          const rows = await manager.query(
            `SELECT * FROM ${targetTable}
             WHERE ${targetPrimaryKey} IN (${placeholders})`,
            ids,
          );
          result.relationships[key] = rows;
          continue;
        }

        // 3) "Via" pattern: { via, join_local_key, target_table, target_foreign_key }
        if (
          cfg.via &&
          cfg.join_local_key &&
          cfg.target_table &&
          cfg.target_foreign_key
        ) {
          const viaTable = id(cfg.via);
          const viaLocalKey = id(cfg.join_local_key);
          const targetTable = id(cfg.target_table);
          const targetForeignKey = id(cfg.target_foreign_key);

          const viaRows: Array<{ id: number }> = await manager.query(
            `SELECT DISTINCT ${targetForeignKey} AS id
             FROM ${viaTable}
            WHERE ${viaLocalKey} = ?`,
            [coreId],
          );
          const ids = viaRows.map((r) => r.id);
          if (!ids.length) {
            result.relationships[key] = [];
            continue;
          }

          const placeholders = ids.map(() => '?').join(',');
          const rows = await manager.query(
            `SELECT * FROM ${targetTable}
             WHERE ${targetForeignKey} IN (${placeholders})`,
            ids,
          );
          result.relationships[key] = rows;
          continue;
        }

        // 4) Legacy seeded project relationships as a backward-compatible path.
        if (objectType === 'project' && key === 'project_tasks') {
          const tasks = await this.taskRepository.find({
            where: { projectId: coreId },
          });
          result.relationships[key] = tasks;
          continue;
        }

        if (objectType === 'project' && key === 'project_customers') {
          const rows: Array<{ customer_id: number }> =
            await this.customerRepository.query(
              `SELECT DISTINCT c.customer_id
               FROM customer_project_members cpm
               JOIN customers c ON cpm.customer_id = c.customer_id
              WHERE cpm.project_id = ?`,
              [coreId],
            );
          const customerIds = rows.map((r) => r.customer_id);
          if (!customerIds.length) {
            result.relationships[key] = [];
            continue;
          }
          const customers = await this.customerRepository.find({
            where: {
              customerId: In(customerIds),
            },
          });
          result.relationships[key] = customers;
          continue;
        }

        if (objectType === 'project' && key === 'project_customer_contacts') {
          const rows: Array<{ customer_id: number }> =
            await this.customerRepository.query(
              `SELECT DISTINCT cpm.customer_id
               FROM customer_project_members cpm
              WHERE cpm.project_id = ?`,
              [coreId],
            );
          const customerIds = rows.map((r) => r.customer_id);
          if (!customerIds.length) {
            result.relationships[key] = [];
            continue;
          }
          const contacts = await this.customerContactInfoRepository.find({
            where: {
              customerId: In(customerIds),
            },
          } as any);
          result.relationships[key] = contacts;
          continue;
        }

        // 5) Fallback: unsupported relationship shape for now.
        result.relationships[key] = [];
      } catch {
        // On any config/SQL error, return an empty set for this relationship
        // rather than failing the entire payload.
        result.relationships[key] = [];
      }
    }

    return result;
  }

  /**
   * Ensures the "from" object belongs to the specified tenant for tenant-aware
   * entities (projects, tasks, resources). For other object types the check
   * is currently a no-op.
   */
  private async assertFromObjectBelongsToTenant(
    tenantId: number,
    objectType: string,
    coreId: number,
  ): Promise<void> {
    if (objectType === 'project') {
      const project = await this.projectRepository.findOne({
        where: { projectId: coreId },
      });
      if (!project || project.tenantId !== tenantId) {
        throw new RpcException(
          'Requested project does not belong to the specified tenant.',
        );
      }
      return;
    }

    if (objectType === 'task') {
      const task = await this.taskRepository.findOne({
        where: { taskId: coreId },
      });
      if (!task || task.tenantId !== tenantId) {
        throw new RpcException(
          'Requested task does not belong to the specified tenant.',
        );
      }
      return;
    }

    if (objectType === 'resource') {
      const resource = await this.resourceRepository.findOne({
        where: { resourceId: coreId },
      });
      if (!resource || resource.tenantId !== tenantId) {
        throw new RpcException(
          'Requested resource does not belong to the specified tenant.',
        );
      }
      return;
    }
  }

  /**
   * Retrieves view definitions and their panels for a given object type.
   *
   * @param objectType - Logical object type key.
   * @returns List of views with their associated panels.
   */
  async getViewsForObjectType(
    objectType: string,
  ): Promise<ConfigObjectViewEntity[]> {
    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType,
      },
    });

    if (!configObject) {
      return [];
    }

    return this.viewRepository.find({
      where: {
        configObjectId: configObject.configObjectId,
      },
      order: {
        viewType: 'ASC',
        isDefault: 'DESC',
      } as any,
      relations: ['panels'],
    });
  }

  /**
   * Lists configured views for a given object type, scoped to a tenant.
   */
  async listConfigViews(
    tenantId: number | null | undefined,
    objectType: string,
  ): Promise<ConfigObjectViewEntity[]> {
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType,
      },
    });

    if (!configObject) {
      return [];
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    return this.viewRepository.find({
      where: {
        configObjectId: configObject.configObjectId,
      },
      order: {
        viewType: 'ASC',
        isDefault: 'DESC',
        configObjectViewId: 'ASC',
      } as any,
      relations: ['panels'],
    });
  }

  /**
   * Creates a new view definition for an object type and logs the change.
   */
  async createConfigView(params: {
    tenantId: number | null | undefined;
    objectType: string;
    createdBy: number;
    viewKey: string;
    viewType: 'list' | 'board' | 'detail';
    name: string;
    description?: string | null;
    roleKey?: string | null;
    isDefault?: boolean;
  }): Promise<ConfigObjectViewEntity> {
    const {
      tenantId,
      objectType,
      createdBy,
      viewKey,
      viewType,
      name,
      description,
      roleKey,
      isDefault,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType,
        status: 'PUBLISHED',
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for view creation.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const existing = await this.viewRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        viewKey,
      },
    });

    if (existing) {
      throw new RpcException(
        `Config view with key "${viewKey}" already exists for object type "${objectType}".`,
      );
    }

    const view = this.viewRepository.create({
      configObjectId: configObject.configObjectId,
      viewKey,
      viewType,
      name,
      description: typeof description === 'undefined' ? null : description,
      roleKey: typeof roleKey === 'undefined' ? null : roleKey,
      isDefault: typeof isDefault === 'boolean' ? isDefault : false,
    });

    const saved = await this.viewRepository.save(view);

    await this.logConfigChange(
      effectiveTenantId,
      'view',
      saved.configObjectViewId,
      'create',
      createdBy,
      null,
      {
        configObjectId: saved.configObjectId,
        viewKey: saved.viewKey,
        viewType: saved.viewType,
        name: saved.name,
        description: saved.description ?? null,
        roleKey: saved.roleKey ?? null,
        isDefault: saved.isDefault,
      },
    );

    return saved;
  }

  /**
   * Updates an existing view definition and logs the change.
   */
  async updateConfigView(params: {
    tenantId: number | null | undefined;
    configObjectViewId: number;
    updatedBy: number;
    name?: string;
    description?: string | null;
    roleKey?: string | null;
    isDefault?: boolean;
  }): Promise<ConfigObjectViewEntity> {
    const {
      tenantId,
      configObjectViewId,
      updatedBy,
      name,
      description,
      roleKey,
      isDefault,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.viewRepository.findOne({
      where: {
        configObjectViewId,
      },
    });

    if (!existing) {
      throw new RpcException('Config view not found.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: existing.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for view.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      name: existing.name,
      description: existing.description ?? null,
      roleKey: existing.roleKey ?? null,
      isDefault: existing.isDefault,
    };

    if (typeof name === 'string') {
      existing.name = name;
    }
    if (typeof description !== 'undefined') {
      existing.description = description;
    }
    if (typeof roleKey !== 'undefined') {
      existing.roleKey = roleKey;
    }
    if (typeof isDefault === 'boolean') {
      existing.isDefault = isDefault;
    }

    const saved = await this.viewRepository.save(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'view',
      saved.configObjectViewId,
      'update',
      updatedBy,
      oldValue,
      {
        name: saved.name,
        description: saved.description ?? null,
        roleKey: saved.roleKey ?? null,
        isDefault: saved.isDefault,
      },
    );

    return saved;
  }

  /**
   * Deletes an existing view definition and logs the change.
   */
  async deleteConfigView(params: {
    tenantId: number | null | undefined;
    configObjectViewId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectViewId, deletedBy } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.viewRepository.findOne({
      where: {
        configObjectViewId,
      },
    });

    if (!existing) {
      return;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: existing.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for view.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      configObjectId: existing.configObjectId,
      viewKey: existing.viewKey,
      viewType: existing.viewType,
      name: existing.name,
      description: existing.description ?? null,
      roleKey: existing.roleKey ?? null,
      isDefault: existing.isDefault,
    };

    await this.viewRepository.remove(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'view',
      configObjectViewId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  private async resolveConfigObjectForEntityScope(params: {
    entityKey: string;
    effectiveTenantId: number | null;
  }): Promise<ConfigObjectEntity> {
    const { entityKey, effectiveTenantId } = params;

    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType: entityKey,
      },
    });

    if (!configObject) {
      throw new RpcException(`Config object not found for entityKey "${entityKey}".`);
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    return configObject;
  }

  private async deactivateViewsInScope(params: {
    configObjectId: number;
    viewType: 'list' | 'board' | 'detail';
    tenantId: number | null;
    exceptConfigObjectViewId?: number;
  }): Promise<void> {
    const { configObjectId, viewType, tenantId, exceptConfigObjectViewId } = params;

    const qb = this.viewRepository
      .createQueryBuilder()
      .update(ConfigObjectViewEntity)
      .set({ isActive: false })
      .where('config_object_id = :configObjectId', { configObjectId })
      .andWhere('view_type = :viewType', { viewType });

    if (tenantId === null) {
      qb.andWhere('tenant_id IS NULL');
    } else {
      qb.andWhere('tenant_id = :tenantId', { tenantId });
    }

    if (typeof exceptConfigObjectViewId === 'number') {
      qb.andWhere('config_object_view_id != :exceptConfigObjectViewId', {
        exceptConfigObjectViewId,
      });
    }

    await qb.execute();
  }

  /**
   * Returns the active scoped view config. Tenant scope falls back to global.
   */
  async getActiveScopedConfigView(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    viewType: 'list' | 'board' | 'detail';
  }): Promise<ConfigObjectViewEntity | null> {
    const { tenantId, entityKey, viewType } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.resolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
    });

    if (effectiveTenantId !== null) {
      const tenantScoped = await this.viewRepository.findOne({
        where: {
          configObjectId: configObject.configObjectId,
          viewType,
          tenantId: effectiveTenantId,
          isActive: true,
        },
        order: { configObjectViewId: 'DESC' },
      });

      if (tenantScoped) {
        return tenantScoped;
      }
    }

    return this.viewRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        viewType,
        tenantId: IsNull(),
        isActive: true,
      },
      order: { configObjectViewId: 'DESC' },
    });
  }

  /**
   * Lists active scoped view configs for an entity.
   * Tenant scope takes precedence over global scope per view type.
   */
  async listActiveScopedConfigViews(params: {
    tenantId: number | null | undefined;
    entityKey: string;
  }): Promise<ConfigObjectViewEntity[]> {
    const { tenantId, entityKey } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.resolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
    });

    if (effectiveTenantId === null) {
      return this.viewRepository.find({
        where: {
          configObjectId: configObject.configObjectId,
          tenantId: IsNull(),
          isActive: true,
        },
        order: {
          viewType: 'ASC',
          configObjectViewId: 'DESC',
        },
      });
    }

    const scopedRows = await this.viewRepository
      .createQueryBuilder('view')
      .where('view.config_object_id = :configObjectId', {
        configObjectId: configObject.configObjectId,
      })
      .andWhere('view.is_active = 1')
      .andWhere('(view.tenant_id = :tenantId OR view.tenant_id IS NULL)', {
        tenantId: effectiveTenantId,
      })
      .orderBy('view.view_type', 'ASC')
      .addOrderBy('view.tenant_id IS NULL', 'ASC')
      .addOrderBy('view.config_object_view_id', 'DESC')
      .getMany();

    const byViewType = new Map<string, ConfigObjectViewEntity>();
    for (const row of scopedRows) {
      if (!byViewType.has(row.viewType)) {
        byViewType.set(row.viewType, row);
      }
    }

    return Array.from(byViewType.values()).sort((a, b) =>
      a.viewType.localeCompare(b.viewType),
    );
  }

  /**
   * Creates or updates a scoped view config record by entityKey + scope.
   */
  async upsertScopedConfigView(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    viewType: 'list' | 'board' | 'detail';
    updatedBy: number;
    configObjectViewId?: number;
    viewKey?: string;
    name?: string;
    description?: string | null;
    roleKey?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    configJson?: Record<string, unknown> | null;
  }): Promise<ConfigObjectViewEntity> {
    const {
      tenantId,
      entityKey,
      viewType,
      updatedBy,
      configObjectViewId,
      viewKey,
      name,
      description,
      roleKey,
      isDefault,
      isActive,
      configJson,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const configObject = await this.resolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
    });

    const lookupWhere =
      effectiveTenantId === null
        ? {
            configObjectId: configObject.configObjectId,
            viewType,
            tenantId: IsNull(),
          }
        : {
            configObjectId: configObject.configObjectId,
            viewType,
            tenantId: effectiveTenantId,
          };

    const existing = configObjectViewId
      ? await this.viewRepository.findOne({
          where: {
            configObjectViewId,
            configObjectId: configObject.configObjectId,
          },
        })
      : await this.viewRepository.findOne({
          where: lookupWhere,
          order: { configObjectViewId: 'DESC' },
        });

    const shouldActivate = typeof isActive === 'boolean' ? isActive : true;
    const viewKeyValue =
      typeof viewKey === 'string' && viewKey.trim().length > 0
        ? viewKey.trim()
        : `${entityKey}_${viewType}_${effectiveTenantId ?? 'global'}`;
    const viewNameValue =
      typeof name === 'string' && name.trim().length > 0
        ? name.trim()
        : `${entityKey} ${viewType} view`;

    if (existing) {
      const nextConfigJson =
        typeof configJson === 'undefined' ? existing.configJson : configJson;
      await this.assertScopedViewConfigFieldKeysExist({
        tenantId: effectiveTenantId,
        entityKey,
        configJson: nextConfigJson,
      });

      const oldValue = {
        viewKey: existing.viewKey,
        name: existing.name,
        description: existing.description ?? null,
        roleKey: existing.roleKey ?? null,
        isDefault: existing.isDefault,
        isActive: existing.isActive,
        configJson: existing.configJson ?? null,
      };

      existing.viewType = viewType;
      existing.viewKey = viewKeyValue;
      existing.name = viewNameValue;
      existing.description =
        typeof description === 'undefined' ? existing.description : description;
      existing.roleKey = typeof roleKey === 'undefined' ? existing.roleKey : roleKey;
      existing.isDefault =
        typeof isDefault === 'boolean' ? isDefault : existing.isDefault;
      existing.isActive = shouldActivate;
      existing.configJson = nextConfigJson;
      existing.updatedBy = updatedBy;

      if (existing.isActive) {
        await this.deactivateViewsInScope({
          configObjectId: configObject.configObjectId,
          viewType,
          tenantId: effectiveTenantId,
          exceptConfigObjectViewId: existing.configObjectViewId,
        });
      }

      const saved = await this.viewRepository.save(existing);

      await this.logConfigChange(
        effectiveTenantId,
        'view',
        saved.configObjectViewId,
        'update',
        updatedBy,
        oldValue,
        {
          viewKey: saved.viewKey,
          name: saved.name,
          description: saved.description ?? null,
          roleKey: saved.roleKey ?? null,
          isDefault: saved.isDefault,
          isActive: saved.isActive,
          configJson: saved.configJson ?? null,
        },
      );

      return saved;
    }

    await this.assertScopedViewConfigFieldKeysExist({
      tenantId: effectiveTenantId,
      entityKey,
      configJson: typeof configJson === 'undefined' ? null : configJson,
    });

    if (shouldActivate) {
      await this.deactivateViewsInScope({
        configObjectId: configObject.configObjectId,
        viewType,
        tenantId: effectiveTenantId,
      });
    }

    const created = this.viewRepository.create({
      configObjectId: configObject.configObjectId,
      viewType,
      viewKey: viewKeyValue,
      name: viewNameValue,
      description: typeof description === 'undefined' ? null : description,
      roleKey: typeof roleKey === 'undefined' ? null : roleKey,
      isDefault: typeof isDefault === 'boolean' ? isDefault : false,
      isActive: shouldActivate,
      tenantId: effectiveTenantId,
      configJson: typeof configJson === 'undefined' ? null : configJson,
      createdBy: updatedBy,
      updatedBy,
    });

    const saved = await this.viewRepository.save(created);

    await this.logConfigChange(
      effectiveTenantId,
      'view',
      saved.configObjectViewId,
      'create',
      updatedBy,
      null,
      {
        viewKey: saved.viewKey,
        name: saved.name,
        description: saved.description ?? null,
        roleKey: saved.roleKey ?? null,
        isDefault: saved.isDefault,
        isActive: saved.isActive,
        configJson: saved.configJson ?? null,
      },
    );

    return saved;
  }

  /**
   * Marks one scoped view as active and deactivates others in the same scope.
   */
  async activateScopedConfigView(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    viewType: 'list' | 'board' | 'detail';
    configObjectViewId: number;
    updatedBy: number;
  }): Promise<ConfigObjectViewEntity> {
    const { tenantId, entityKey, viewType, configObjectViewId, updatedBy } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.resolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
    });

    const target = await this.viewRepository.findOne({
      where: {
        configObjectViewId,
        configObjectId: configObject.configObjectId,
        viewType,
      },
    });

    if (!target) {
      throw new RpcException('Scoped config view not found for activation.');
    }

    const targetTenant = target.tenantId ?? null;
    if (targetTenant !== effectiveTenantId) {
      throw new RpcException(
        'Scoped config view does not match the requested tenant scope.',
      );
    }

    await this.deactivateViewsInScope({
      configObjectId: configObject.configObjectId,
      viewType,
      tenantId: effectiveTenantId,
      exceptConfigObjectViewId: target.configObjectViewId,
    });

    target.isActive = true;
    target.updatedBy = updatedBy;
    const saved = await this.viewRepository.save(target);

    await this.logConfigChange(
      effectiveTenantId,
      'view',
      saved.configObjectViewId,
      'update',
      updatedBy,
      { isActive: false },
      { isActive: true },
    );

    return saved;
  }

  /**
   * Deactivates a scoped view (or all views in scope when id is omitted).
   */
  async deactivateScopedConfigView(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    viewType: 'list' | 'board' | 'detail';
    configObjectViewId?: number;
    updatedBy: number;
  }): Promise<{ deactivated: number }> {
    const { tenantId, entityKey, viewType, configObjectViewId, updatedBy } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.resolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
    });

    if (typeof configObjectViewId === 'number') {
      const target = await this.viewRepository.findOne({
        where: {
          configObjectViewId,
          configObjectId: configObject.configObjectId,
          viewType,
        },
      });

      if (!target) {
        return { deactivated: 0 };
      }

      const targetTenant = target.tenantId ?? null;
      if (targetTenant !== effectiveTenantId) {
        throw new RpcException(
          'Scoped config view does not match the requested tenant scope.',
        );
      }

      target.isActive = false;
      target.updatedBy = updatedBy;
      await this.viewRepository.save(target);

      await this.logConfigChange(
        effectiveTenantId,
        'view',
        target.configObjectViewId,
        'update',
        updatedBy,
        { isActive: true },
        { isActive: false },
      );

      return { deactivated: 1 };
    }

    const qb = this.viewRepository
      .createQueryBuilder()
      .update(ConfigObjectViewEntity)
      .set({ isActive: false, updatedBy })
      .where('config_object_id = :configObjectId', {
        configObjectId: configObject.configObjectId,
      })
      .andWhere('view_type = :viewType', { viewType });

    if (effectiveTenantId === null) {
      qb.andWhere('tenant_id IS NULL');
    } else {
      qb.andWhere('tenant_id = :tenantId', { tenantId: effectiveTenantId });
    }

    const result = await qb.execute();
    return { deactivated: result.affected ?? 0 };
  }

  /**
   * Lists panels for a given view, scoped to a tenant.
   */
  async listConfigViewPanels(params: {
    tenantId: number | null | undefined;
    configObjectViewId: number;
  }): Promise<ConfigObjectViewPanelEntity[]> {
    const { tenantId, configObjectViewId } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const view = await this.viewRepository.findOne({
      where: {
        configObjectViewId,
      },
    });

    if (!view) {
      return [];
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: view.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for view panels.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    return this.panelRepository.find({
      where: {
        configObjectViewId,
      },
      order: {
        orderIndex: 'ASC',
      },
    });
  }

  /**
   * Creates a new panel within a view and logs the change.
   */
  async createConfigViewPanel(params: {
    tenantId: number | null | undefined;
    configObjectViewId: number;
    createdBy: number;
    panelKey: string;
    title: string;
    panelType: 'summary' | 'section' | 'related' | 'custom';
    layoutConfig?: Record<string, unknown> | null;
    orderIndex?: number;
  }): Promise<ConfigObjectViewPanelEntity> {
    const {
      tenantId,
      configObjectViewId,
      createdBy,
      panelKey,
      title,
      panelType,
      layoutConfig,
      orderIndex,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const view = await this.viewRepository.findOne({
      where: {
        configObjectViewId,
      },
    });

    if (!view) {
      throw new RpcException('Config view not found for panel creation.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: view.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for panel.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const existing = await this.panelRepository.findOne({
      where: {
        configObjectViewId,
        panelKey,
      },
    });

    if (existing) {
      throw new RpcException(
        `Panel with key "${panelKey}" already exists for view.`,
      );
    }

    const panel = this.panelRepository.create({
      configObjectViewId,
      panelKey,
      title,
      panelType,
      layoutConfig: typeof layoutConfig === 'undefined' ? null : layoutConfig,
      orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
    });

    const saved = await this.panelRepository.save(panel);

    await this.logConfigChange(
      effectiveTenantId,
      'panel',
      saved.configObjectViewPanelId,
      'create',
      createdBy,
      null,
      {
        configObjectViewId: saved.configObjectViewId,
        panelKey: saved.panelKey,
        title: saved.title,
        panelType: saved.panelType,
        layoutConfig: saved.layoutConfig ?? null,
        orderIndex: saved.orderIndex,
      },
    );

    return saved;
  }

  /**
   * Updates an existing panel within a view and logs the change.
   */
  async updateConfigViewPanel(params: {
    tenantId: number | null | undefined;
    configObjectViewPanelId: number;
    updatedBy: number;
    title?: string;
    panelType?: 'summary' | 'section' | 'related' | 'custom';
    layoutConfig?: Record<string, unknown> | null;
    orderIndex?: number;
  }): Promise<ConfigObjectViewPanelEntity> {
    const {
      tenantId,
      configObjectViewPanelId,
      updatedBy,
      title,
      panelType,
      layoutConfig,
      orderIndex,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.panelRepository.findOne({
      where: {
        configObjectViewPanelId,
      },
    });

    if (!existing) {
      throw new RpcException('Config view panel not found.');
    }

    const view = await this.viewRepository.findOne({
      where: {
        configObjectViewId: existing.configObjectViewId,
      },
    });

    if (!view) {
      throw new RpcException('Config view not found for panel.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: view.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for panel.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      title: existing.title,
      panelType: existing.panelType,
      layoutConfig: existing.layoutConfig ?? null,
      orderIndex: existing.orderIndex,
    };

    if (typeof title === 'string') {
      existing.title = title;
    }
    if (typeof panelType === 'string') {
      existing.panelType = panelType;
    }
    if (typeof layoutConfig !== 'undefined') {
      existing.layoutConfig = layoutConfig;
    }
    if (typeof orderIndex === 'number') {
      existing.orderIndex = orderIndex;
    }

    const saved = await this.panelRepository.save(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'panel',
      saved.configObjectViewPanelId,
      'update',
      updatedBy,
      oldValue,
      {
        title: saved.title,
        panelType: saved.panelType,
        layoutConfig: saved.layoutConfig ?? null,
        orderIndex: saved.orderIndex,
      },
    );

    return saved;
  }

  /**
   * Deletes a panel within a view and logs the change.
   */
  async deleteConfigViewPanel(params: {
    tenantId: number | null | undefined;
    configObjectViewPanelId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectViewPanelId, deletedBy } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.panelRepository.findOne({
      where: {
        configObjectViewPanelId,
      },
    });

    if (!existing) {
      return;
    }

    const view = await this.viewRepository.findOne({
      where: {
        configObjectViewId: existing.configObjectViewId,
      },
    });

    if (!view) {
      throw new RpcException('Config view not found for panel.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configObjectId: view.configObjectId,
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for panel.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      configObjectViewId: existing.configObjectViewId,
      panelKey: existing.panelKey,
      title: existing.title,
      panelType: existing.panelType,
      layoutConfig: existing.layoutConfig ?? null,
      orderIndex: existing.orderIndex,
    };

    await this.panelRepository.remove(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'panel',
      configObjectViewPanelId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Lists configuration template sets for a given tenant.
   *
   * @param tenantId - Tenant identifier used to scope template sets.
   * @returns List of template sets ordered by creation time.
   */
  async listTemplateSets(
    tenantId: number | null | undefined,
  ): Promise<ConfigTemplateSetEntity[]> {
    const normalizedTenantId =
      typeof tenantId === 'number' && tenantId > 0 ? tenantId : null;

    if (normalizedTenantId === null) {
      // Super admin / global scope: return all template sets regardless of tenant.
      return this.templateSetRepository.find({
        order: {
          configTemplateSetId: 'ASC',
        },
      });
    }

    return this.templateSetRepository.find({
      where: {
        tenantId: normalizedTenantId,
      },
      order: {
        configTemplateSetId: 'ASC',
      },
    });
  }

  /**
   * Creates a new configuration template set and logs the change.
   *
   * @param tenantId - Tenant that will own the template set.
   * @param key - Unique logical key for the template set.
   * @param name - Human-readable name of the template set.
   * @param description - Optional description.
   * @param status - Lifecycle status of the template set.
   * @param createdBy - Tenant user identifier that created the template set.
   * @returns The persisted template set entity.
   */
  async createTemplateSet(
    tenantId: number | null | undefined,
    key: string,
    name: string,
    description: string | null,
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CONFLICT',
    createdBy: number,
  ): Promise<ConfigTemplateSetEntity> {
    const normalizedTenantId =
      typeof tenantId === 'number' && tenantId > 0 ? tenantId : null;

    const templateSet = this.templateSetRepository.create({
      tenantId: normalizedTenantId,
      key,
      name,
      description,
      status,
      createdBy,
      // Ensure we don't rely on a DB-level default (often 0) that will
      // violate the foreign key to tenant_users on initial insert.
      updatedBy: null,
    });

    const saved = await this.templateSetRepository.save(templateSet);

    await this.logConfigChange(
      normalizedTenantId ?? 0,
      'template_set',
      saved.configTemplateSetId,
      'create',
      createdBy,
      null,
      {
        key: saved.key,
        name: saved.name,
        description: saved.description ?? null,
        status: saved.status,
      },
    );

    return saved;
  }

  /**
   * Updates an existing configuration template set and logs the change.
   *
   * @param tenantId - Tenant that owns the template set.
   * @param configTemplateSetId - Identifier of the template set to update.
   * @param updatedBy - Tenant user identifier performing the update.
   * @param patch - Partial fields to update.
   * @returns The updated template set entity.
   */
  async updateTemplateSet(
    tenantId: number | null | undefined,
    configTemplateSetId: number,
    updatedBy: number,
    patch: {
      name?: string;
      description?: string | null;
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CONFLICT';
    },
  ): Promise<ConfigTemplateSetEntity> {
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    // When effectiveTenantId is null, treat this as a system-level operation
    // (e.g. super admin) and look up the template set by ID only. For
    // tenant-scoped calls, enforce the tenantId match.
    const existing = await this.templateSetRepository.findOne({
      where:
        effectiveTenantId === null
          ? { configTemplateSetId }
          : {
              configTemplateSetId,
              tenantId: effectiveTenantId,
            },
    });

    if (!existing) {
      throw new Error('Template set not found for tenant.');
    }

    const oldValue = {
      name: existing.name,
      description: existing.description ?? null,
      status: existing.status,
    };

    if (typeof patch.name === 'string') {
      existing.name = patch.name;
    }
    if (typeof patch.description !== 'undefined') {
      existing.description = patch.description;
    }
    if (typeof patch.status === 'string') {
      existing.status = patch.status;
    }
    existing.updatedBy = updatedBy;

    const saved = await this.templateSetRepository.save(existing);

    // For system-level updates (effectiveTenantId === 0), log against the
    // owning tenant of the template set to keep audit data consistent.
    await this.logConfigChange(
      existing.tenantId ?? 0,
      'template_set',
      saved.configTemplateSetId,
      'update',
      updatedBy,
      oldValue,
      {
        name: saved.name,
        description: saved.description ?? null,
        status: saved.status,
      },
    );

    return saved;
  }

  /**
   * Deactivates (soft-disables) a configuration template set and logs the change.
   *
   * @param tenantId - Tenant that owns the template set.
   * @param configTemplateSetId - Identifier of the template set to deactivate.
   * @param updatedBy - Tenant user identifier performing the deactivation.
   * @returns The updated template set entity.
   */
  async deactivateTemplateSet(
    tenantId: number | null | undefined,
    configTemplateSetId: number,
    updatedBy: number,
  ): Promise<ConfigTemplateSetEntity> {
    return this.updateTemplateSet(tenantId, configTemplateSetId, updatedBy, {
      status: 'ARCHIVED',
    });
  }

  /**
   * Helper method that loads a core entity and its associated meta JSON row
   * for the supported configurable object types.
   *
   * @param objectType - Logical object type key.
   * @param coreId - Identifier of the core record.
   * @returns The core entity and meta JSON, or `null` values when the record does not exist.
   */
  private async loadCoreAndMeta(
    objectType: string,
    coreId: number,
  ): Promise<{
    coreEntity:
      | ProjectEntity
      | TaskEntity
      | CustomerEntity
      | CustomerContactInfoEntity
      | ResourceEntity
      | null;
    metaJson: Record<string, unknown> | null;
  }> {
    if (objectType === 'project') {
      const project = await this.projectRepository.findOne({
        where: { projectId: coreId },
      });

      if (!project) {
        return { coreEntity: null, metaJson: null };
      }

      const meta = await this.projectMetaRepository.findOne({
        where: { projectId: coreId },
      });

      return {
        coreEntity: project,
        metaJson: meta ? meta.metaJson : null,
      };
    }

    if (objectType === 'task') {
      const task = await this.taskRepository.findOne({
        where: { taskId: coreId },
      });

      if (!task) {
        return { coreEntity: null, metaJson: null };
      }

      const meta = await this.taskMetaRepository.findOne({
        where: { taskId: coreId },
      });

      return {
        coreEntity: task,
        metaJson: meta ? meta.metaJson : null,
      };
    }

    if (objectType === 'customer') {
      const customer = await this.customerRepository.findOne({
        where: { customerId: coreId },
      });

      if (!customer) {
        return { coreEntity: null, metaJson: null };
      }

      const meta = await this.customerMetaRepository.findOne({
        where: { customerId: coreId },
      });

      return {
        coreEntity: customer,
        metaJson: meta ? meta.metaJson : null,
      };
    }

    if (objectType === 'customer_contact') {
      const contact = await this.customerContactInfoRepository.findOne({
        where: { customerContactId: coreId },
      });

      if (!contact) {
        return { coreEntity: null, metaJson: null };
      }

      const meta = await this.customerContactInfoMetaRepository.findOne({
        where: { customerContactId: coreId },
      });

      return {
        coreEntity: contact,
        metaJson: meta ? meta.metaJson : null,
      };
    }

    if (objectType === 'resource') {
      const resource = await this.resourceRepository.findOne({
        where: { resourceId: coreId },
      });

      if (!resource) {
        return { coreEntity: null, metaJson: null };
      }

      const meta = await this.resourceMetaRepository.findOne({
        where: { resourceId: coreId },
      });

      return {
        coreEntity: resource,
        metaJson: meta ? meta.metaJson : null,
      };
    }

    return {
      coreEntity: null,
      metaJson: null,
    };
  }
}
