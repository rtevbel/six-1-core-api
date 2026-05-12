import { Controller, UseFilters, UsePipes, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { ConfigObjectsService } from './config_objects.service';
import { ConfigLifecycleService } from './config_lifecycle.service';
import {
  MICROSERVICE_GET_CONFIG_SCHEMA_PATTERN,
  MICROSERVICE_GET_OBJECT_LIST_FIELD_CATALOG_PATTERN,
  MICROSERVICE_LIST_CONFIG_FIELDS_PATTERN,
  MICROSERVICE_LIST_CONFIG_FIELD_RULES_PATTERN,
  MICROSERVICE_LIST_CONFIG_OBJECTS_PATTERN,
  MICROSERVICE_CREATE_CONFIG_OBJECT_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_OBJECT_PATTERN,
  MICROSERVICE_DELETE_CONFIG_OBJECT_PATTERN,
  MICROSERVICE_LIST_CUSTOM_OBJECT_INSTANCES_PATTERN,
  MICROSERVICE_GET_CUSTOM_OBJECT_INSTANCE_PATTERN,
  MICROSERVICE_CREATE_CUSTOM_OBJECT_INSTANCE_PATTERN,
  MICROSERVICE_UPDATE_CUSTOM_OBJECT_INSTANCE_PATTERN,
  MICROSERVICE_DELETE_CUSTOM_OBJECT_INSTANCE_PATTERN,
  MICROSERVICE_RESOLVE_CONFIG_INSTANCE_PATTERN,
  MICROSERVICE_APPLY_SOR_BOUND_INSTANCE_PATCH_PATTERN,
  MICROSERVICE_GET_CONFIG_LIFECYCLES_PATTERN,
  MICROSERVICE_GET_CONFIG_RELATIONSHIPS_PATTERN,
  MICROSERVICE_GET_CONFIG_RELATIONSHIP_RELATED_FIELD_CATALOG_PATTERN,
  MICROSERVICE_GET_CONFIG_VIEWS_PATTERN,
  MICROSERVICE_LIST_CONFIG_VIEWS_PATTERN,
  MICROSERVICE_CREATE_CONFIG_FIELD_PATTERN,
  MICROSERVICE_CREATE_CONFIG_FIELD_RULE_PATTERN,
  MICROSERVICE_CREATE_CONFIG_VIEW_PATTERN,
  MICROSERVICE_GET_ACTIVE_CONFIG_VIEW_PATTERN,
  MICROSERVICE_LIST_ACTIVE_CONFIG_VIEWS_PATTERN,
  MICROSERVICE_UPSERT_CONFIG_VIEW_SCOPE_PATTERN,
  MICROSERVICE_ACTIVATE_CONFIG_VIEW_SCOPE_PATTERN,
  MICROSERVICE_DEACTIVATE_CONFIG_VIEW_SCOPE_PATTERN,
  MICROSERVICE_GET_RUNTIME_MANIFEST_PATTERN,
  MICROSERVICE_INVALIDATE_RUNTIME_CACHE_PATTERN,
  MICROSERVICE_COMPOSE_RUNTIME_SUBMIT_PAYLOAD_PATTERN,
  MICROSERVICE_VALIDATE_RUNTIME_RELATION_ACTION_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_FIELD_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_FIELD_RULE_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_VIEW_PATTERN,
  MICROSERVICE_DELETE_CONFIG_FIELD_PATTERN,
  MICROSERVICE_DELETE_CONFIG_FIELD_RULE_PATTERN,
  MICROSERVICE_DELETE_CONFIG_VIEW_PATTERN,
  MICROSERVICE_LIST_CONFIG_VIEW_PANELS_PATTERN,
  MICROSERVICE_CREATE_CONFIG_VIEW_PANEL_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_VIEW_PANEL_PATTERN,
  MICROSERVICE_DELETE_CONFIG_VIEW_PANEL_PATTERN,
  MICROSERVICE_GET_RELATED_OBJECTS_PATTERN,
  MICROSERVICE_LIST_TEMPLATE_SETS_PATTERN,
  MICROSERVICE_CREATE_TEMPLATE_SET_PATTERN,
  MICROSERVICE_UPDATE_TEMPLATE_SET_PATTERN,
  MICROSERVICE_DEACTIVATE_TEMPLATE_SET_PATTERN,
  MICROSERVICE_CREATE_CONFIG_LIFECYCLE_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_LIFECYCLE_PATTERN,
  MICROSERVICE_DELETE_CONFIG_LIFECYCLE_PATTERN,
  MICROSERVICE_CREATE_CONFIG_LIFECYCLE_TRANSITION_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_LIFECYCLE_TRANSITION_PATTERN,
  MICROSERVICE_DELETE_CONFIG_LIFECYCLE_TRANSITION_PATTERN,
  MICROSERVICE_CREATE_CONFIG_RELATIONSHIP_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_RELATIONSHIP_PATTERN,
  MICROSERVICE_DELETE_CONFIG_RELATIONSHIP_PATTERN,
  MICROSERVICE_GET_INSTANCE_LIFECYCLE_STATE_PATTERN,
  MICROSERVICE_LIST_CONFIG_STATUS_MAPPINGS_PATTERN,
  MICROSERVICE_CREATE_CONFIG_STATUS_MAPPING_PATTERN,
  MICROSERVICE_UPDATE_CONFIG_STATUS_MAPPING_PATTERN,
  MICROSERVICE_DELETE_CONFIG_STATUS_MAPPING_PATTERN,
  MICROSERVICE_RESOLVE_LIFECYCLE_STATE_FROM_STATUS_PATTERN,
  MICROSERVICE_RESOLVE_STATUS_FROM_LIFECYCLE_STATE_PATTERN,
} from './constants';
import { GetConfigSchemaDto } from './dto/get-config-schema.dto';
import { GetObjectListFieldCatalogDto } from './dto/get-object-list-field-catalog.dto';
import { ResolveConfigInstanceDto } from './dto/resolve-config-instance.dto';
import {
  CreateCustomObjectInstanceDto,
  DeleteCustomObjectInstanceDto,
  GetCustomObjectInstanceDto,
  ListCustomObjectInstancesDto,
  UpdateCustomObjectInstanceDto,
} from './dto/custom-object-instance.dto';
import { GetConfigLifecyclesDto } from './dto/get-config-lifecycles.dto';
import { GetConfigRelationshipsDto } from './dto/get-config-relationships.dto';
import { GetRelatedFieldCatalogDto } from './dto/get-related-field-catalog.dto';
import type { RelationDescriptor } from './interfaces/relation-descriptor.interface';
import {
  ApplySorBoundInstancePatchResult,
  ConfigObjectRunnerSchemaView,
  ConfigObjectResolvedInstance,
} from './interfaces/config-object-resolved-instance.interface';
import type { ObjectListFieldCatalogView } from './list-field-catalog/object-list-field-catalog.interface';
import { ApplySorBoundInstancePatchDto } from './dto/apply-sor-bound-instance-patch.dto';
import { ConfigObjectEntity } from './entities/config_object.entity';
import { ConfigCustomObjectInstanceEntity } from './entities/config_custom_object_instance.entity';
import { ConfigObjectLifecycleEntity } from './entities/config_object_lifecycle.entity';
import { ConfigObjectLifecycleTransitionEntity } from './entities/config_object_lifecycle_transition.entity';
import { ConfigObjectFieldEntity } from './entities/config_object_field.entity';
import { ConfigObjectFieldRuleEntity } from './entities/config_object_field_rule.entity';
import { ConfigObjectRelationshipEntity } from './entities/config_object_relationship.entity';
import { ConfigObjectViewEntity } from './entities/config_object_view.entity';
import { ConfigObjectViewPanelEntity } from './entities/config_object_view_panel.entity';
import { ConfigTemplateSetEntity } from './entities/config_template_set.entity';
import {
  CreateTemplateSetDto,
  DeactivateTemplateSetDto,
  ListTemplateSetsDto,
  UpdateTemplateSetDto,
} from './dto/template-set.dto';
import {
  ListConfigObjectsDto,
  CreateConfigObjectDto,
  UpdateConfigObjectDto,
  DeleteConfigObjectDto,
} from './dto/config-object.dto';
import {
  ListConfigFieldsDto,
  CreateConfigFieldDto,
  UpdateConfigFieldDto,
  DeleteConfigFieldDto,
} from './dto/config-field.dto';
import {
  ListConfigFieldRulesDto,
  CreateConfigFieldRuleDto,
  UpdateConfigFieldRuleDto,
  DeleteConfigFieldRuleDto,
} from './dto/config-field-rule.dto';
import {
  CreateConfigViewDto,
  DeleteConfigViewDto,
  ListConfigViewsDto,
  UpdateConfigViewDto,
} from './dto/config-view.dto';
import {
  CreateConfigViewPanelDto,
  DeleteConfigViewPanelDto,
  ListConfigViewPanelsDto,
  UpdateConfigViewPanelDto,
} from './dto/config-view-panel.dto';
import {
  ActivateScopedConfigViewDto,
  DeactivateScopedConfigViewDto,
  GetActiveScopedConfigViewDto,
  ListActiveScopedConfigViewsDto,
  UpsertScopedConfigViewDto,
} from './dto/scoped-config-view.dto';
import { GetRelatedObjectsDto } from './dto/get-related-objects.dto';
import { GetRuntimeManifestDto } from './dto/get-runtime-manifest.dto';
import { InvalidateRuntimeCacheDto } from './dto/invalidate-runtime-cache.dto';
import { ComposeRuntimeSubmitPayloadDto } from './dto/compose-runtime-submit-payload.dto';
import { ValidateRuntimeRelationActionDto } from './dto/validate-runtime-relation-action.dto';
import {
  InstanceLifecycleStateDto,
  InstanceLifecycleStateView,
} from './dto/config-lifecycle.dto';
import { RelatedObjectsResult } from './interfaces/config-object-resolved-instance.interface';
import {
  ConfigObjectRuntimeManifestView,
  RuntimeComposedSubmitPayloadView,
  RuntimeCacheInvalidationResult,
  RuntimeRelationActionValidationResult,
} from './interfaces/runtime-manifest.interface';
import { RequirePermissions } from '../authorization/authorization.decorator';
import {
  CreateLifecycleDto,
  CreateLifecycleTransitionDto,
  DeleteLifecycleDto,
  DeleteLifecycleTransitionDto,
  UpdateLifecycleDto,
  UpdateLifecycleTransitionDto,
} from './dto/config-lifecycle.dto';
import {
  CreateConfigRelationshipDto,
  DeleteConfigRelationshipDto,
  UpdateConfigRelationshipDto,
} from './dto/config-relationship.dto';
import {
  CreateConfigStatusMappingDto,
  DeleteConfigStatusMappingDto,
  ListConfigStatusMappingsDto,
  ResolveLifecycleStateFromStatusDto,
  ResolveStatusFromLifecycleStateDto,
  UpdateConfigStatusMappingDto,
} from './dto/config-status-mapping.dto';
import { ConfigObjectStatusMappingEntity } from './entities/config_object_status_mapping.entity';

/**
 * ConfigObjectsController handles message patterns related to
 * configurable object schemas and resolved instances.
 *
 * @version 0.0.1
 */
@Controller('config-objects')
@UseFilters(AppRpcExceptionsFilter)
export class ConfigObjectsController {
  /**
   * Initializes the controller with the ConfigObjectsService and
   * ConfigLifecycleService.
   */
  constructor(
    private readonly configObjectsService: ConfigObjectsService,
    private readonly configLifecycleService: ConfigLifecycleService,
  ) {}

  /**
   * Retrieves the configuration schema for a given tenant and object type.
   *
   * @param {GetConfigSchemaDto} dto - DTO containing tenant and object type.
   * @returns {Promise<ConfigObjectRunnerSchemaView | null>} - Schema plus runner hints or null.
   */
  @MessagePattern(MICROSERVICE_GET_CONFIG_SCHEMA_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getConfigSchema(
    @Payload('data') dto: GetConfigSchemaDto,
  ): Promise<ConfigObjectRunnerSchemaView | null> {
    return this.configObjectsService.getObjectSchema(
      dto.tenantId ?? null,
      dto.objectType,
    );
  }

  /**
   * Returns list filter/sort catalog for Object Designer (single gateway entry point).
   */
  @MessagePattern(MICROSERVICE_GET_OBJECT_LIST_FIELD_CATALOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getObjectListFieldCatalog(
    @Payload('data') dto: GetObjectListFieldCatalogDto,
  ): Promise<ObjectListFieldCatalogView> {
    return this.configObjectsService.getObjectListFieldCatalog({
      tenantId: dto.tenantId ?? null,
      objectType: dto.objectType,
    });
  }

  /**
   * Resolves a configurable object instance by combining the core entity
   * and its dynamic field values.
   *
   * @param {ResolveConfigInstanceDto} dto - DTO containing tenant, type and core identifier.
   * @returns {Promise<ConfigObjectResolvedInstance | null>} - Resolved instance or null.
   */
  @MessagePattern(MICROSERVICE_RESOLVE_CONFIG_INSTANCE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async resolveConfigInstance(
    @Payload('data') dto: ResolveConfigInstanceDto,
  ): Promise<ConfigObjectResolvedInstance | null> {
    return this.configObjectsService.resolveObjectInstance(
      dto.tenantId,
      dto.objectType,
      dto.coreId,
      dto.instanceId,
    );
  }

  /**
   * Applies allowlisted SoR column updates and `*_meta` JSON in one transaction
   * for `sor_bound` objects. Gateway must enforce domain permissions first.
   */
  @MessagePattern(MICROSERVICE_APPLY_SOR_BOUND_INSTANCE_PATCH_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async applySorBoundInstancePatch(
    @Payload('data') dto: ApplySorBoundInstancePatchDto,
  ): Promise<ApplySorBoundInstancePatchResult> {
    return this.configObjectsService.applySorBoundInstancePatch({
      tenantId: dto.tenantId,
      objectType: dto.objectType,
      coreId: dto.coreId,
      corePatch: dto.corePatch,
      metaPatch: dto.metaPatch,
      customerId: dto.customerId,
    });
  }

  /**
   * Retrieves lifecycle configuration for a given object type.
   *
   * @param {GetConfigLifecyclesDto} dto - DTO containing tenant and object type.
   * @returns {Promise<ConfigObjectLifecycleEntity[]>} - List of lifecycle states.
   */
  @MessagePattern(MICROSERVICE_GET_CONFIG_LIFECYCLES_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getConfigLifecycles(
    @Payload('data') dto: GetConfigLifecyclesDto,
  ): Promise<ConfigObjectLifecycleEntity[]> {
    return this.configObjectsService.getLifecyclesForObjectType(dto.objectType);
  }

  /**
   * Retrieves relationship metadata for a given object type.
   *
   * @param {GetConfigRelationshipsDto} dto - DTO containing tenant and object type.
   * @returns {Promise<ConfigObjectRelationshipEntity[]>} - List of relationships.
   */
  @MessagePattern(MICROSERVICE_GET_CONFIG_RELATIONSHIPS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getConfigRelationships(
    @Payload('data') dto: GetConfigRelationshipsDto,
  ): Promise<RelationDescriptor[]> {
    return this.configObjectsService.getRelationshipsForObjectType(
      dto.objectType,
    );
  }

  /**
   * Returns field keys on the target (`toObjectType`) of a relationship for authoring UIs.
   */
  @MessagePattern(MICROSERVICE_GET_CONFIG_RELATIONSHIP_RELATED_FIELD_CATALOG_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getConfigRelationshipRelatedFieldCatalog(
    @Payload('data') dto: GetRelatedFieldCatalogDto,
  ): Promise<{
    fromObjectType: string;
    relationshipKey: string;
    toObjectType: string;
    cardinality: string;
    relationshipSource: 'orm' | 'designer';
    fieldKeys: string[];
  }> {
    return this.configObjectsService.getRelatedFieldCatalogForRelationship({
      tenantId: dto.tenantId,
      fromObjectType: dto.fromObjectType,
      relationshipKey: dto.relationshipKey,
    });
  }

  /**
   * Creates a new lifecycle state for a configurable object type.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_LIFECYCLE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigLifecycle(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateLifecycleDto,
  ): Promise<ConfigObjectLifecycleEntity> {
    return this.configLifecycleService.createLifecycle({
      tenantId: dto.tenantId ?? null,
      configTemplateSetId: dto.configTemplateSetId,
      objectType: dto.objectType,
      createdBy: dto.createdBy,
      stateKey: dto.stateKey,
      label: dto.label,
      description: dto.description ?? null,
      orderIndex: dto.orderIndex,
    });
  }

  /**
   * Updates an existing lifecycle state.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_LIFECYCLE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigLifecycle(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateLifecycleDto,
  ): Promise<ConfigObjectLifecycleEntity> {
    return this.configLifecycleService.updateLifecycle({
      tenantId: dto.tenantId ?? null,
      configObjectLifecycleId: dto.configObjectLifecycleId,
      updatedBy: dto.updatedBy,
      label: dto.label,
      description: dto.description,
      orderIndex: dto.orderIndex,
    });
  }

  /**
   * Deletes a lifecycle state.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_LIFECYCLE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigLifecycle(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteLifecycleDto,
  ): Promise<void> {
    await this.configLifecycleService.deleteLifecycle({
      tenantId: dto.tenantId ?? null,
      configObjectLifecycleId: dto.configObjectLifecycleId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Creates a new lifecycle transition.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_LIFECYCLE_TRANSITION_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigLifecycleTransition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateLifecycleTransitionDto,
  ): Promise<ConfigObjectLifecycleTransitionEntity> {
    return this.configLifecycleService.createLifecycleTransition({
      tenantId: dto.tenantId ?? null,
      configTemplateSetId: dto.configTemplateSetId,
      objectType: dto.objectType,
      createdBy: dto.createdBy,
      fromStateKey: dto.fromStateKey,
      toStateKey: dto.toStateKey,
      rulesJson: dto.rulesJson ?? null,
    });
  }

  /**
   * Updates an existing lifecycle transition.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_LIFECYCLE_TRANSITION_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigLifecycleTransition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateLifecycleTransitionDto,
  ): Promise<ConfigObjectLifecycleTransitionEntity> {
    return this.configLifecycleService.updateLifecycleTransition({
      tenantId: dto.tenantId ?? null,
      configObjectLifecycleTransitionId: dto.configObjectLifecycleTransitionId,
      updatedBy: dto.updatedBy,
      rulesJson: dto.rulesJson ?? null,
    });
  }

  /**
   * Deletes a lifecycle transition.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_LIFECYCLE_TRANSITION_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigLifecycleTransition(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteLifecycleTransitionDto,
  ): Promise<void> {
    await this.configLifecycleService.deleteLifecycleTransition({
      tenantId: dto.tenantId ?? null,
      configObjectLifecycleTransitionId: dto.configObjectLifecycleTransitionId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Retrieves configured views (list, detail, form) and their panels
   * for a given object type.
   *
   * @param {GetConfigSchemaDto} dto - DTO containing tenant and object type.
   * @returns {Promise<ConfigObjectViewEntity[]>} - List of views with panels.
   */
  @MessagePattern(MICROSERVICE_GET_CONFIG_VIEWS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getConfigViews(
    @Payload('data') dto: GetConfigSchemaDto,
  ): Promise<ConfigObjectViewEntity[]> {
    return this.configObjectsService.getViewsForObjectType(dto.objectType);
  }

  /**
   * Lists configured views (list, detail, form) for an object type,
   * including their panels, scoped to a tenant.
   */
  @MessagePattern(MICROSERVICE_LIST_CONFIG_VIEWS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listConfigViews(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListConfigViewsDto,
  ): Promise<{
    configViews: ConfigObjectViewEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const configViews = await this.configObjectsService.listConfigViews(
      dto.tenantId ?? null,
      dto.objectType,
    );

    return {
      configViews,
      pagination: {
        total: configViews.length,
        page: 1,
        limit: configViews.length || 1,
      },
    };
  }

  /**
   * Lists configuration template sets for a given tenant.
   *
   * @param {ListTemplateSetsDto} dto - DTO containing tenant identifier.
   * @returns {Promise<ConfigTemplateSetEntity[]>} - List of template sets.
   */
  @MessagePattern(MICROSERVICE_LIST_TEMPLATE_SETS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listTemplateSets(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListTemplateSetsDto,
  ): Promise<{
    templateSets: ConfigTemplateSetEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const templateSets = await this.configObjectsService.listTemplateSets(
      dto.tenantId ?? null,
    );

    return {
      templateSets,
      pagination: {
        total: templateSets.length,
        page: 1,
        limit: templateSets.length || 1,
      },
    };
  }

  /**
   * Creates a new configuration template set for a tenant.
   *
   * @param {CreateTemplateSetDto} dto - DTO containing tenant and template set details.
   * @returns {Promise<ConfigTemplateSetEntity>} - The created template set.
   */
  @MessagePattern(MICROSERVICE_CREATE_TEMPLATE_SET_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createTemplateSet(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateTemplateSetDto,
  ): Promise<ConfigTemplateSetEntity> {
    return this.configObjectsService.createTemplateSet(
      dto.tenantId ?? null,
      dto.key,
      dto.name,
      dto.description ?? null,
      dto.status ?? 'DRAFT',
      dto.createdBy,
    );
  }

  /**
   * Updates an existing configuration template set.
   *
   * @param {UpdateTemplateSetDto} dto - DTO containing tenant, template set id and patch.
   * @returns {Promise<ConfigTemplateSetEntity>} - The updated template set.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TEMPLATE_SET_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateTemplateSet(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateTemplateSetDto,
  ): Promise<ConfigTemplateSetEntity> {
    return this.configObjectsService.updateTemplateSet(
      dto.tenantId ?? null,
      dto.configTemplateSetId,
      dto.updatedBy,
      {
        name: dto.name,
        description:
          typeof dto.description === 'undefined' ? undefined : dto.description,
        status: typeof dto.status === 'undefined' ? undefined : dto.status,
      },
    );
  }

  /**
   * Deactivates (soft-disables) a configuration template set.
   *
   * @param {DeactivateTemplateSetDto} dto - DTO containing tenant and template set id.
   * @returns {Promise<ConfigTemplateSetEntity>} - The updated template set.
   */
  @MessagePattern(MICROSERVICE_DEACTIVATE_TEMPLATE_SET_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deactivateTemplateSet(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeactivateTemplateSetDto,
  ): Promise<ConfigTemplateSetEntity> {
    return this.configObjectsService.deactivateTemplateSet(
      dto.tenantId ?? null,
      dto.configTemplateSetId,
      dto.updatedBy,
    );
  }

  /**
   * Lists configuration objects for a tenant and optional template set.
   */
  @MessagePattern(MICROSERVICE_LIST_CONFIG_OBJECTS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listConfigObjects(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListConfigObjectsDto,
  ): Promise<{
    configObjects: ConfigObjectEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const configObjects = await this.configObjectsService.listConfigObjects(
      dto.tenantId ?? null,
      dto.configTemplateSetId,
      dto.status,
      dto.bindingMode,
    );

    return {
      configObjects,
      pagination: {
        total: configObjects.length,
        page: 1,
        limit: configObjects.length || 1,
      },
    };
  }

  /**
   * Creates a new configuration object within a template set.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_OBJECT_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigObject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateConfigObjectDto,
  ): Promise<ConfigObjectEntity> {
    return this.configObjectsService.createConfigObject({
      tenantId: dto.tenantId ?? null,
      configTemplateSetId: dto.configTemplateSetId,
      createdBy: dto.createdBy,
      objectType: dto.objectType,
      bindingMode: dto.bindingMode,
      sorTableName: dto.sorTableName,
      displayName: dto.displayName,
      description: dto.description ?? null,
      status: dto.status,
    });
  }

  /**
   * Updates an existing configuration object.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_OBJECT_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigObject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateConfigObjectDto,
  ): Promise<ConfigObjectEntity> {
    return this.configObjectsService.updateConfigObject({
      tenantId: dto.tenantId ?? null,
      configObjectId: dto.configObjectId,
      updatedBy: dto.updatedBy ?? userId,
      displayName: dto.displayName,
      description:
        typeof dto.description === 'undefined' ? undefined : dto.description,
      status: typeof dto.status === 'undefined' ? undefined : dto.status,
      objectType:
        typeof dto.objectType === 'undefined' ? undefined : dto.objectType,
      bindingMode: dto.bindingMode,
      sorTableName:
        typeof dto.sorTableName === 'undefined' ? undefined : dto.sorTableName,
    });
  }

  /**
   * Deletes an existing configuration object.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_OBJECT_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigObject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteConfigObjectDto,
  ): Promise<void> {
    await this.configObjectsService.deleteConfigObject({
      tenantId: dto.tenantId ?? null,
      configObjectId: dto.configObjectId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Lists standalone custom object instances for a tenant and config object.
   */
  @MessagePattern(MICROSERVICE_LIST_CUSTOM_OBJECT_INSTANCES_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listCustomObjectInstances(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListCustomObjectInstancesDto,
  ): Promise<{
    instances: ConfigCustomObjectInstanceEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const instances = await this.configObjectsService.listCustomObjectInstances(
      {
        tenantId: dto.tenantId,
        configObjectId: dto.configObjectId,
        status: dto.status,
      },
    );

    return {
      instances,
      pagination: {
        total: instances.length,
        page: 1,
        limit: instances.length || 1,
      },
    };
  }

  /**
   * Fetches one standalone custom object instance.
   */
  @MessagePattern(MICROSERVICE_GET_CUSTOM_OBJECT_INSTANCE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async getCustomObjectInstance(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: GetCustomObjectInstanceDto,
  ): Promise<ConfigCustomObjectInstanceEntity | null> {
    return this.configObjectsService.getCustomObjectInstance({
      tenantId: dto.tenantId,
      configCustomObjectInstanceId: dto.configCustomObjectInstanceId,
    });
  }

  /**
   * Creates a standalone custom object instance.
   */
  @MessagePattern(MICROSERVICE_CREATE_CUSTOM_OBJECT_INSTANCE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createCustomObjectInstance(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateCustomObjectInstanceDto,
  ): Promise<ConfigCustomObjectInstanceEntity> {
    return this.configObjectsService.createCustomObjectInstance({
      tenantId: dto.tenantId,
      configObjectId: dto.configObjectId,
      createdBy: dto.createdBy,
      payload: dto.payload,
      status: dto.status,
    });
  }

  /**
   * Updates a standalone custom object instance.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CUSTOM_OBJECT_INSTANCE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateCustomObjectInstance(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateCustomObjectInstanceDto,
  ): Promise<ConfigCustomObjectInstanceEntity> {
    return this.configObjectsService.updateCustomObjectInstance({
      tenantId: dto.tenantId,
      configCustomObjectInstanceId: dto.configCustomObjectInstanceId,
      updatedBy: dto.updatedBy ?? userId,
      payload: dto.payload,
      status: dto.status,
    });
  }

  /**
   * Deletes a standalone custom object instance.
   */
  @MessagePattern(MICROSERVICE_DELETE_CUSTOM_OBJECT_INSTANCE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteCustomObjectInstance(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteCustomObjectInstanceDto,
  ): Promise<void> {
    await this.configObjectsService.deleteCustomObjectInstance({
      tenantId: dto.tenantId,
      configCustomObjectInstanceId: dto.configCustomObjectInstanceId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Lists configuration fields for a given config object.
   */
  @MessagePattern(MICROSERVICE_LIST_CONFIG_FIELDS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listConfigFields(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListConfigFieldsDto,
  ): Promise<{
    configFields: ConfigObjectFieldEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const configFields = await this.configObjectsService.listConfigFields({
      tenantId: dto.tenantId ?? null,
      configObjectId: dto.configObjectId,
    });

    return {
      configFields,
      pagination: {
        total: configFields.length,
        page: 1,
        limit: configFields.length || 1,
      },
    };
  }

  /**
   * Creates a new configuration field.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_FIELD_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigField(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateConfigFieldDto,
  ): Promise<ConfigObjectFieldEntity> {
    return this.configObjectsService.createConfigField({
      tenantId: dto.tenantId ?? null,
      configObjectId: dto.configObjectId,
      createdBy: dto.createdBy,
      fieldKey: dto.fieldKey,
      label: dto.label,
      description: dto.description ?? null,
      fieldType: dto.fieldType,
      validationJson:
        typeof dto.validationJson === 'undefined'
          ? undefined
          : dto.validationJson,
      defaultValue:
        typeof dto.defaultValue === 'undefined' ? undefined : dto.defaultValue,
      isRequired: dto.isRequired,
      isSystem: dto.isSystem,
      orderIndex: dto.orderIndex,
      sectionKey: dto.sectionKey ?? null,
    });
  }

  /**
   * Updates an existing configuration field.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_FIELD_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigField(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateConfigFieldDto,
  ): Promise<ConfigObjectFieldEntity> {
    return this.configObjectsService.updateConfigField({
      tenantId: dto.tenantId ?? null,
      configObjectFieldId: dto.configObjectFieldId,
      updatedBy: dto.updatedBy,
      label: dto.label,
      description:
        typeof dto.description === 'undefined' ? undefined : dto.description,
      fieldType: dto.fieldType,
      validationJson:
        typeof dto.validationJson === 'undefined'
          ? undefined
          : dto.validationJson,
      defaultValue:
        typeof dto.defaultValue === 'undefined' ? undefined : dto.defaultValue,
      isRequired: dto.isRequired,
      isSystem: dto.isSystem,
      orderIndex: dto.orderIndex,
      sectionKey:
        typeof dto.sectionKey === 'undefined' ? undefined : dto.sectionKey,
    });
  }

  /**
   * Deletes an existing configuration field.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_FIELD_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigField(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteConfigFieldDto,
  ): Promise<void> {
    await this.configObjectsService.deleteConfigField({
      tenantId: dto.tenantId,
      configObjectFieldId: dto.configObjectFieldId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Lists field-rule rows for one config field.
   */
  @MessagePattern(MICROSERVICE_LIST_CONFIG_FIELD_RULES_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listConfigFieldRules(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListConfigFieldRulesDto,
  ): Promise<{
    configFieldRules: ConfigObjectFieldRuleEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const configFieldRules = await this.configObjectsService.listConfigFieldRules({
      tenantId: dto.tenantId ?? null,
      configObjectFieldId: dto.configObjectFieldId,
    });

    return {
      configFieldRules,
      pagination: {
        total: configFieldRules.length,
        page: 1,
        limit: configFieldRules.length || 1,
      },
    };
  }

  /**
   * Creates one field-rule row.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_FIELD_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigFieldRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateConfigFieldRuleDto,
  ): Promise<ConfigObjectFieldRuleEntity> {
    return this.configObjectsService.createConfigFieldRule({
      tenantId: dto.tenantId ?? null,
      configObjectFieldId: dto.configObjectFieldId,
      createdBy: dto.createdBy,
      lifecycleStateKey: dto.lifecycleStateKey,
      roleKey: dto.roleKey,
      isVisible: dto.isVisible,
      isReadonly: dto.isReadonly,
      isRequired: dto.isRequired,
      rulesJson: dto.rulesJson,
    });
  }

  /**
   * Updates one field-rule row.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_FIELD_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigFieldRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateConfigFieldRuleDto,
  ): Promise<ConfigObjectFieldRuleEntity> {
    return this.configObjectsService.updateConfigFieldRule({
      tenantId: dto.tenantId ?? null,
      configObjectFieldRuleId: dto.configObjectFieldRuleId,
      updatedBy: dto.updatedBy,
      lifecycleStateKey: dto.lifecycleStateKey,
      roleKey: dto.roleKey,
      isVisible: dto.isVisible,
      isReadonly: dto.isReadonly,
      isRequired: dto.isRequired,
      rulesJson: dto.rulesJson,
    });
  }

  /**
   * Deletes one field-rule row.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_FIELD_RULE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigFieldRule(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteConfigFieldRuleDto,
  ): Promise<void> {
    await this.configObjectsService.deleteConfigFieldRule({
      tenantId: dto.tenantId ?? null,
      configObjectFieldRuleId: dto.configObjectFieldRuleId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Creates a new relationship metadata entry.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_RELATIONSHIP_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigRelationship(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateConfigRelationshipDto,
  ): Promise<ConfigObjectRelationshipEntity> {
    return this.configObjectsService.createConfigRelationship({
      tenantId: dto.tenantId ?? 0,
      fromObjectType: dto.fromObjectType,
      toObjectType: dto.toObjectType,
      relationshipKey: dto.relationshipKey,
      displayName: dto.displayName,
      cardinality: dto.cardinality,
      queryConfig: dto.queryConfig,
      createdBy: dto.createdBy,
      isActive: dto.isActive,
      relationshipSource: dto.relationshipSource,
      relationManifestsByKey: dto.relationManifestsByKey,
    });
  }

  /**
   * Updates an existing relationship metadata entry.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_RELATIONSHIP_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigRelationship(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateConfigRelationshipDto,
  ): Promise<ConfigObjectRelationshipEntity> {
    return this.configObjectsService.updateConfigRelationship({
      tenantId: dto.tenantId ?? 0,
      configObjectRelationshipId: dto.configObjectRelationshipId,
      updatedBy: dto.updatedBy,
      displayName: dto.displayName,
      cardinality: dto.cardinality,
      queryConfig: dto.queryConfig,
      isActive: dto.isActive,
      relationshipSource: dto.relationshipSource,
      relationManifestsByKey: dto.relationManifestsByKey,
    });
  }

  /**
   * Deletes a relationship metadata entry.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_RELATIONSHIP_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigRelationship(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteConfigRelationshipDto,
  ): Promise<void> {
    await this.configObjectsService.deleteConfigRelationship({
      tenantId: dto.tenantId ?? 0,
      configObjectRelationshipId: dto.configObjectRelationshipId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Creates a new configuration view for an object type.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_VIEW_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigView(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateConfigViewDto,
  ): Promise<ConfigObjectViewEntity> {
    return this.configObjectsService.createConfigView({
      tenantId: dto.tenantId ?? null,
      objectType: dto.objectType,
      createdBy: dto.createdBy,
      viewKey: dto.viewKey,
      viewType: dto.viewType as any,
      name: dto.name,
      description: dto.description ?? null,
      roleKey: typeof dto.roleKey === 'undefined' ? undefined : dto.roleKey,
      isDefault: dto.isDefault,
    });
  }

  /**
   * Updates an existing configuration view.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_VIEW_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigView(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateConfigViewDto,
  ): Promise<ConfigObjectViewEntity> {
    return this.configObjectsService.updateConfigView({
      tenantId: dto.tenantId ?? null,
      configObjectViewId: dto.configObjectViewId,
      updatedBy: dto.updatedBy,
      name: dto.name,
      description:
        typeof dto.description === 'undefined' ? undefined : dto.description,
      roleKey: typeof dto.roleKey === 'undefined' ? undefined : dto.roleKey,
      isDefault: dto.isDefault,
    });
  }

  /**
   * Deletes an existing configuration view.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_VIEW_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigView(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteConfigViewDto,
  ): Promise<void> {
    await this.configObjectsService.deleteConfigView({
      tenantId: dto.tenantId ?? null,
      configObjectViewId: dto.configObjectViewId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Returns the active scoped view config for an entity and view type.
   * Tenant scope falls back to global scope when no tenant override exists.
   */
  @MessagePattern(MICROSERVICE_GET_ACTIVE_CONFIG_VIEW_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getActiveScopedConfigView(
    @Payload('data') dto: GetActiveScopedConfigViewDto,
  ): Promise<ConfigObjectViewEntity | null> {
    return this.configObjectsService.getActiveScopedConfigView({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      viewType: dto.viewType,
    });
  }

  /**
   * Lists active scoped view configs for an entityKey.
   * When tenant scope is provided, tenant records win over global by view type.
   */
  @MessagePattern(MICROSERVICE_LIST_ACTIVE_CONFIG_VIEWS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async listActiveScopedConfigViews(
    @Payload('data') dto: ListActiveScopedConfigViewsDto,
  ): Promise<ConfigObjectViewEntity[]> {
    return this.configObjectsService.listActiveScopedConfigViews({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
    });
  }

  /**
   * Upserts scoped view config by entityKey + tenant + viewType.
   */
  @MessagePattern(MICROSERVICE_UPSERT_CONFIG_VIEW_SCOPE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async upsertScopedConfigView(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpsertScopedConfigViewDto,
  ): Promise<ConfigObjectViewEntity> {
    return this.configObjectsService.upsertScopedConfigView({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      viewType: dto.viewType,
      updatedBy: dto.updatedBy,
      configObjectViewId: dto.configObjectViewId,
      viewKey: dto.viewKey,
      name: dto.name,
      description: dto.description,
      roleKey: dto.roleKey,
      isDefault: dto.isDefault,
      isActive: dto.isActive,
      configJson:
        typeof dto.configJson === 'undefined' ? undefined : dto.configJson,
    });
  }

  /**
   * Activates one view in the requested scope and deactivates siblings.
   */
  @MessagePattern(MICROSERVICE_ACTIVATE_CONFIG_VIEW_SCOPE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async activateScopedConfigView(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ActivateScopedConfigViewDto,
  ): Promise<ConfigObjectViewEntity> {
    return this.configObjectsService.activateScopedConfigView({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      viewType: dto.viewType,
      configObjectViewId: dto.configObjectViewId,
      updatedBy: dto.updatedBy,
    });
  }

  /**
   * Deactivates one scoped view, or all views in scope when id is omitted.
   */
  @MessagePattern(MICROSERVICE_DEACTIVATE_CONFIG_VIEW_SCOPE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deactivateScopedConfigView(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeactivateScopedConfigViewDto,
  ): Promise<{ deactivated: number }> {
    return this.configObjectsService.deactivateScopedConfigView({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      viewType: dto.viewType,
      configObjectViewId: dto.configObjectViewId,
      updatedBy: dto.updatedBy ?? userId,
    });
  }

  /**
   * Returns runtime manifest payload (list/detail/form) for Object Runner.
   */
  @MessagePattern(MICROSERVICE_GET_RUNTIME_MANIFEST_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getRuntimeManifest(
    @Payload('data') dto: GetRuntimeManifestDto,
  ): Promise<ConfigObjectRuntimeManifestView> {
    return this.configObjectsService.getRuntimeManifest({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      includeDiagnostics: dto.includeDiagnostics ?? true,
    });
  }

  /**
   * Manually invalidates runtime caches (schema/view/manifest).
   */
  @MessagePattern(MICROSERVICE_INVALIDATE_RUNTIME_CACHE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async invalidateRuntimeCache(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: InvalidateRuntimeCacheDto,
  ): Promise<RuntimeCacheInvalidationResult> {
    return this.configObjectsService.invalidateRuntimeCaches({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      includeSchemaCache: dto.includeSchemaCache,
      includeViewCache: dto.includeViewCache,
      includeManifestCache: dto.includeManifestCache,
    });
  }

  /**
   * Composes runtime submit payload (root + nested relation blocks) for create/update.
   */
  @MessagePattern(MICROSERVICE_COMPOSE_RUNTIME_SUBMIT_PAYLOAD_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async composeRuntimeSubmitPayload(
    @Payload('data') dto: ComposeRuntimeSubmitPayloadDto,
  ): Promise<RuntimeComposedSubmitPayloadView> {
    return this.configObjectsService.composeRuntimeSubmitPayload({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      operation: dto.operation,
      fieldValues: dto.fieldValues,
      relationBlocks: dto.relationBlocks ?? {},
    });
  }

  /**
   * Validates relation action permissions for runtime execution.
   */
  @MessagePattern(MICROSERVICE_VALIDATE_RUNTIME_RELATION_ACTION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async validateRuntimeRelationAction(
    @Payload('data') dto: ValidateRuntimeRelationActionDto,
  ): Promise<RuntimeRelationActionValidationResult> {
    return this.configObjectsService.validateRuntimeRelationAction({
      tenantId: dto.tenantId ?? null,
      entityKey: dto.entityKey,
      relationKey: dto.relationKey,
      actionRef: dto.actionRef,
      grantedPermissions: dto.grantedPermissions ?? [],
    });
  }

  /**
   * Lists panels for a given configuration view.
   */
  @MessagePattern(MICROSERVICE_LIST_CONFIG_VIEW_PANELS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listConfigViewPanels(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListConfigViewPanelsDto,
  ): Promise<{
    configViewPanels: ConfigObjectViewPanelEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const configViewPanels =
      await this.configObjectsService.listConfigViewPanels({
        tenantId: dto.tenantId ?? null,
        configObjectViewId: dto.configObjectViewId,
      });

    return {
      configViewPanels,
      pagination: {
        total: configViewPanels.length,
        page: 1,
        limit: configViewPanels.length || 1,
      },
    };
  }

  /**
   * Creates a new configuration view panel.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_VIEW_PANEL_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigViewPanel(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateConfigViewPanelDto,
  ): Promise<ConfigObjectViewPanelEntity> {
    return this.configObjectsService.createConfigViewPanel({
      tenantId: dto.tenantId ?? null,
      configObjectViewId: dto.configObjectViewId,
      createdBy: dto.createdBy,
      panelKey: dto.panelKey,
      title: dto.title,
      panelType: dto.panelType as any,
      layoutConfig:
        typeof dto.layoutConfig === 'undefined' ? undefined : dto.layoutConfig,
      orderIndex: dto.orderIndex,
    });
  }

  /**
   * Updates an existing configuration view panel.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_VIEW_PANEL_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigViewPanel(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateConfigViewPanelDto,
  ): Promise<ConfigObjectViewPanelEntity> {
    return this.configObjectsService.updateConfigViewPanel({
      tenantId: dto.tenantId ?? null,
      configObjectViewPanelId: dto.configObjectViewPanelId,
      updatedBy: dto.updatedBy,
      title: dto.title,
      panelType: dto.panelType as any,
      layoutConfig:
        typeof dto.layoutConfig === 'undefined' ? undefined : dto.layoutConfig,
      orderIndex: dto.orderIndex,
    });
  }

  /**
   * Deletes an existing configuration view panel.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_VIEW_PANEL_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigViewPanel(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteConfigViewPanelDto,
  ): Promise<void> {
    await this.configObjectsService.deleteConfigViewPanel({
      tenantId: dto.tenantId ?? null,
      configObjectViewPanelId: dto.configObjectViewPanelId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Resolves related objects for a given configurable object instance using
   * relationship metadata.
   */
  @MessagePattern(MICROSERVICE_GET_RELATED_OBJECTS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getRelatedObjects(
    @Payload('data') dto: GetRelatedObjectsDto,
  ): Promise<RelatedObjectsResult> {
    return this.configObjectsService.getRelatedObjects(
      dto.tenantId,
      dto.objectType,
      dto.coreId,
    );
  }

  /**
   * Returns current lifecycle state and allowed transitions for a specific
   * instance (project or task).
   */
  @MessagePattern(MICROSERVICE_GET_INSTANCE_LIFECYCLE_STATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async getInstanceLifecycleState(
    @Payload('data') dto: InstanceLifecycleStateDto,
  ): Promise<InstanceLifecycleStateView> {
    const result = await this.configLifecycleService.getInstanceLifecycleState({
      tenantId: dto.tenantId,
      objectType: dto.objectType,
      coreId: dto.coreId,
    });

    return {
      objectType: result.objectType,
      coreId: result.coreId,
      tenantId: result.tenantId,
      currentLifecycleState: result.currentLifecycleState,
      allowedTransitions: result.allowedTransitions.map((t) => ({
        toStateKey: t.toStateKey,
        rulesJson: t.rulesJson ? JSON.stringify(t.rulesJson) : null,
      })),
    };
  }

  /**
   * Lists lifecycle-to-status mappings for an object type.
   */
  @MessagePattern(MICROSERVICE_LIST_CONFIG_STATUS_MAPPINGS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async listConfigStatusMappings(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListConfigStatusMappingsDto,
  ): Promise<{
    mappings: ConfigObjectStatusMappingEntity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const mappings = await this.configObjectsService.listConfigStatusMappings({
      tenantId: dto.tenantId ?? null,
      objectType: dto.objectType,
    });

    return {
      mappings,
      pagination: {
        total: mappings.length,
        page: 1,
        limit: mappings.length || 1,
      },
    };
  }

  /**
   * Creates a lifecycle-to-status mapping row.
   */
  @MessagePattern(MICROSERVICE_CREATE_CONFIG_STATUS_MAPPING_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async createConfigStatusMapping(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateConfigStatusMappingDto,
  ): Promise<ConfigObjectStatusMappingEntity> {
    return this.configObjectsService.createConfigStatusMapping({
      tenantId: dto.tenantId ?? null,
      objectType: dto.objectType,
      createdBy: dto.createdBy,
      stateKey: dto.stateKey,
      statusSource: dto.statusSource,
      statusValue: dto.statusValue,
      isDefault: dto.isDefault,
      isTerminal: dto.isTerminal,
      orderIndex: dto.orderIndex,
    });
  }

  /**
   * Updates an existing lifecycle-to-status mapping row.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CONFIG_STATUS_MAPPING_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async updateConfigStatusMapping(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateConfigStatusMappingDto,
  ): Promise<ConfigObjectStatusMappingEntity> {
    return this.configObjectsService.updateConfigStatusMapping({
      tenantId: dto.tenantId ?? null,
      configObjectStatusMappingId: dto.configObjectStatusMappingId,
      updatedBy: dto.updatedBy,
      stateKey: dto.stateKey,
      statusSource: dto.statusSource,
      statusValue: dto.statusValue,
      isDefault: dto.isDefault,
      isTerminal: dto.isTerminal,
      orderIndex: dto.orderIndex,
    });
  }

  /**
   * Deletes a lifecycle-to-status mapping row.
   */
  @MessagePattern(MICROSERVICE_DELETE_CONFIG_STATUS_MAPPING_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  async deleteConfigStatusMapping(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: DeleteConfigStatusMappingDto,
  ): Promise<void> {
    await this.configObjectsService.deleteConfigStatusMapping({
      tenantId: dto.tenantId ?? null,
      configObjectStatusMappingId: dto.configObjectStatusMappingId,
      deletedBy: dto.deletedBy,
    });
  }

  /**
   * Resolves lifecycle state key for a persisted status value.
   */
  @MessagePattern(MICROSERVICE_RESOLVE_LIFECYCLE_STATE_FROM_STATUS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async resolveLifecycleStateFromStatus(
    @Payload('data') dto: ResolveLifecycleStateFromStatusDto,
  ): Promise<{
    objectType: string;
    statusSource: string;
    statusValue: string;
    stateKey: string | null;
  }> {
    return this.configObjectsService.resolveLifecycleStateFromStatus({
      tenantId: dto.tenantId ?? null,
      objectType: dto.objectType,
      statusSource: dto.statusSource,
      statusValue: dto.statusValue,
    });
  }

  /**
   * Resolves persisted status value for a lifecycle state key.
   */
  @MessagePattern(MICROSERVICE_RESOLVE_STATUS_FROM_LIFECYCLE_STATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async resolveStatusFromLifecycleState(
    @Payload('data') dto: ResolveStatusFromLifecycleStateDto,
  ): Promise<{
    objectType: string;
    stateKey: string;
    statusSource: string | null;
    statusValue: string | null;
  }> {
    return this.configObjectsService.resolveStatusFromLifecycleState({
      tenantId: dto.tenantId ?? null,
      objectType: dto.objectType,
      stateKey: dto.stateKey,
      statusSource: dto.statusSource,
    });
  }
}
