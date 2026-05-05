import { Injectable, Logger } from '@nestjs/common';
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
import type { ConfigObjectViewType } from './constants/config-object-view-type';
import {
  AuthoringErrorCode,
  authoringRpcException,
} from './constants/authoring-error-codes';
import { RuntimeErrorCode } from './constants/runtime-error-codes';
import {
  listViewActionBindingKeys,
  listViewColumnFieldKeys,
  ListViewConfigValidationError,
  validateAndNormalizeListViewConfigJson,
} from './list-view-config';
import type { ListViewConfig } from './list-view-config/list-view-config.types';
import {
  PanelLayoutConfigValidationError,
  validateAndNormalizePanelLayoutConfigJson,
} from './panel-layout';
import {
  DetailFormViewConfigValidationError,
  validateAndNormalizeDetailFormViewConfigJson,
} from './detail-form-view-config';
import type { DetailFormViewConfig } from './detail-form-view-config/detail-form-view-config.types';
import {
  DerivedDisplayAuthoringValidationError,
  validateDerivedDisplayAuthoringMetadata,
} from './derived-display-authoring';
import {
  DerivedRuntimeAuthoringValidationError,
  LookupSelectAuthoringValidationError,
  validateDerivedRuntimeAuthoringMetadata,
  validateLookupSelectAuthoringMetadata,
} from './field-runtime-authoring';
import {
  mapRelationAuthoringErrorToRpc,
  normalizeQueryConfigInlineRelation,
  validateAndNormalizeRelationManifestsByKey,
} from './relation-authoring';
import type { RelationDescriptor } from './interfaces/relation-descriptor.interface';
import { generateOrmRelationDescriptorsForObjectType } from './relation-catalog/relation-catalog.generator';
import { finalizeCoreFieldDescriptors } from './core-field-descriptor/core-field-descriptor.write-schema';
import type { CoreFieldDescriptor } from './core-field-descriptor/core-field-descriptor.types';
import type { CoreFieldDerivedRuntimeConfig } from './core-field-descriptor/core-field-descriptor.runtime-metadata.types';
import { canonicalizeObjectType } from './core-field-descriptor/object-type-entity.registry';
import type { PanelLayoutDisplayMode } from './panel-layout/panel-layout.types';
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
import { inferDefaultBindingModeForObjectType } from './object-catalog-scope';
import type {
  ConfigObjectRuntimeManifestView,
  RuntimeComposedSubmitPayloadView,
  RuntimeManifestDiagnostic,
  RuntimeCacheInvalidationResult,
  RuntimeRelationActionValidationResult,
  RuntimeManifestViewSection,
} from './interfaces/runtime-manifest.interface';

/**
 * Service responsible for resolving configuration metadata and
 * merging it with core system-of-record entities.
 *
 * @version 0.0.1
 */
@Injectable()
export class ConfigObjectsService {
  private readonly runtimeCacheTtlMs = 30_000;
  private readonly runtimeRelationMaxDepth = 1;
  private readonly runtimeRelationMaxPageSize = 100;
  private readonly schemaCache = new Map<
    string,
    { expiresAt: number; value: ConfigObjectRunnerSchemaView | null }
  >();
  private readonly activeViewCache = new Map<
    string,
    { expiresAt: number; value: ConfigObjectViewEntity | null }
  >();
  private readonly runtimeManifestCache = new Map<
    string,
    { expiresAt: number; value: ConfigObjectRuntimeManifestView }
  >();

  private static readonly FORBIDDEN_VIEW_CONFIG_INLINE_FIELD_KEYS = [
    'fieldDefinitions',
    'inlineFields',
  ] as const;

  private readonly logger = new Logger(ConfigObjectsService.name);

  private isFresh(expiresAt: number): boolean {
    return expiresAt > Date.now();
  }

  private getSchemaCacheKey(
    tenantId: number | null,
    objectType: string,
  ): string {
    return `${tenantId ?? 'global'}::${objectType}`;
  }

  private getActiveViewCacheKey(params: {
    tenantId: number | null;
    entityKey: string;
    viewType: ConfigObjectViewType;
  }): string {
    return `${params.tenantId ?? 'global'}::${params.entityKey}::${params.viewType}`;
  }

  private getRuntimeManifestCacheKey(params: {
    tenantId: number | null;
    entityKey: string;
    includeDiagnostics: boolean;
  }): string {
    return `${params.tenantId ?? 'global'}::${params.entityKey}::${params.includeDiagnostics ? 'diag' : 'no_diag'}`;
  }

  private clearExpiredRuntimeCaches(): void {
    const now = Date.now();
    for (const [key, entry] of this.schemaCache.entries()) {
      if (entry.expiresAt <= now) {
        this.schemaCache.delete(key);
      }
    }
    for (const [key, entry] of this.activeViewCache.entries()) {
      if (entry.expiresAt <= now) {
        this.activeViewCache.delete(key);
      }
    }
    for (const [key, entry] of this.runtimeManifestCache.entries()) {
      if (entry.expiresAt <= now) {
        this.runtimeManifestCache.delete(key);
      }
    }
  }

  private clearCacheByPredicate<T>(
    map: Map<string, T>,
    predicate: (key: string) => boolean,
  ): number {
    let removed = 0;
    for (const key of map.keys()) {
      if (predicate(key)) {
        map.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

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
   * Canonical `config_objects.object_type` format is singular, lowercase.
   */
  private normalizeCanonicalObjectTypeOrThrow(objectType: string): string {
    const canonical = canonicalizeObjectType(objectType);
    if (!canonical) {
      throw new RpcException('object_type must be a non-empty string.');
    }
    return canonical;
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

    if ('fieldRegistry' in schema && Array.isArray(schema.fieldRegistry)) {
      this.applyDerivedRuntimeFields({
        fieldRegistry: schema.fieldRegistry,
        target: dynamicFields,
      });
    }

    return dynamicFields;
  }

  private normalizeDerivedInputValue(value: unknown, trim: boolean): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const normalized = String(value);
    const out = trim ? normalized.trim() : normalized;
    return out.length > 0 ? out : null;
  }

  private evaluateDerivedRuntimeValue(
    cfg: CoreFieldDerivedRuntimeConfig,
    source: Record<string, unknown>,
  ): string | null {
    const trim = cfg.trim !== false;
    const values = cfg.sourceFieldKeys.map((k) =>
      this.normalizeDerivedInputValue(source[k], trim),
    );

    if (cfg.operation === 'coalesce') {
      for (const value of values) {
        if (value !== null) {
          return value;
        }
      }
      return cfg.nullDisplayValue ?? null;
    }

    const separator = cfg.separator ?? ' ';
    const nonNullValues = values.filter((v): v is string => v !== null);
    if (!nonNullValues.length) {
      return cfg.nullDisplayValue ?? null;
    }
    const joined = nonNullValues.join(separator);
    const finalValue = trim ? joined.trim() : joined;
    return finalValue.length > 0 ? finalValue : (cfg.nullDisplayValue ?? null);
  }

  private applyDerivedRuntimeFields(params: {
    fieldRegistry: CoreFieldDescriptor[];
    target: Record<string, unknown>;
  }): void {
    const { fieldRegistry, target } = params;
    for (const descriptor of fieldRegistry) {
      const cfg = descriptor.derivedRuntimeConfig;
      if (!cfg) {
        continue;
      }
      // Preserve explicit value from source/default; derive only when missing.
      if (Object.prototype.hasOwnProperty.call(target, descriptor.fieldKey)) {
        continue;
      }
      target[descriptor.fieldKey] = this.evaluateDerivedRuntimeValue(cfg, target);
    }
  }

  private setValueAtPath(
    target: Record<string, unknown>,
    path: string,
    value: unknown,
  ): void {
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const segments = normalizedPath
      .split('.')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (!segments.length) {
      return;
    }
    let cursor: Record<string, unknown> | unknown[] = target;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const seg = segments[i];
      const nextSeg = segments[i + 1];
      const idx = Number(seg);
      const isArrayIndex = Number.isInteger(idx) && String(idx) === seg;
      const nextIsArray = Number.isInteger(Number(nextSeg)) && String(Number(nextSeg)) === nextSeg;
      if (isArrayIndex) {
        if (!Array.isArray(cursor)) {
          return;
        }
        if (cursor[idx] == null) {
          cursor[idx] = nextIsArray ? [] : {};
        }
        cursor = cursor[idx] as Record<string, unknown> | unknown[];
      } else {
        const obj = cursor as Record<string, unknown>;
        if (obj[seg] == null) {
          obj[seg] = nextIsArray ? [] : {};
        }
        cursor = obj[seg] as Record<string, unknown> | unknown[];
      }
    }
    const last = segments[segments.length - 1];
    const lastIdx = Number(last);
    const lastIsArrayIndex = Number.isInteger(lastIdx) && String(lastIdx) === last;
    if (lastIsArrayIndex) {
      if (Array.isArray(cursor)) {
        cursor[lastIdx] = value;
      }
      return;
    }
    (cursor as Record<string, unknown>)[last] = value;
  }

  private getInlineRelationPath(rel: RelationDescriptor): string {
    const inlineRelation =
      rel.queryConfig &&
      typeof rel.queryConfig === 'object' &&
      !Array.isArray(rel.queryConfig)
        ? (rel.queryConfig as Record<string, unknown>).inlineRelation
        : null;
    if (
      inlineRelation &&
      typeof inlineRelation === 'object' &&
      !Array.isArray(inlineRelation)
    ) {
      const path = (inlineRelation as Record<string, unknown>).path;
      if (typeof path === 'string' && path.trim().length > 0) {
        return path.trim();
      }
    }
    return rel.relationshipKey;
  }

  private isInlineRequiredRelation(rel: RelationDescriptor): boolean {
    const inlineRelation =
      rel.queryConfig &&
      typeof rel.queryConfig === 'object' &&
      !Array.isArray(rel.queryConfig)
        ? (rel.queryConfig as Record<string, unknown>).inlineRelation
        : null;
    if (
      !inlineRelation ||
      typeof inlineRelation !== 'object' ||
      Array.isArray(inlineRelation)
    ) {
      return false;
    }
    return (inlineRelation as Record<string, unknown>).mode === 'inline_required';
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
    bindingMode: ConfigObjectBindingMode;
  }): Promise<void> {
    const { tenantId, entityKey, configJson, bindingMode } = params;
    if (!configJson) {
      return;
    }

    // system_table fields are resolved from external DTO/OpenAPI in gateway composition.
    // Core cannot reliably validate those keys against config_object_fields.
    if (bindingMode === 'system_table') {
      return;
    }

    const schema = await this.getObjectSchema(tenantId, entityKey);
    if (!schema) {
      throw authoringRpcException(
        AuthoringErrorCode.ViewSchemaUnavailable,
        'Unable to resolve schema for scoped view validation.',
      );
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
      throw authoringRpcException(
        AuthoringErrorCode.ViewUnknownFieldKeys,
        `Scoped view config contains unknown field keys: ${invalidFieldKeys.join(', ')}`,
      );
    }
  }

  private normalizeListViewConfigJsonOrThrow(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    try {
      return validateAndNormalizeListViewConfigJson(value) as unknown as Record<
        string,
        unknown
      >;
    } catch (error) {
      if (error instanceof ListViewConfigValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.ViewListConfigInvalid,
          error.message,
        );
      }
      throw error;
    }
  }

  private normalizePanelLayoutConfigOrThrow(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    try {
      const normalized = validateAndNormalizePanelLayoutConfigJson(value);
      if (!normalized) {
        throw authoringRpcException(
          AuthoringErrorCode.PanelLayoutInvalid,
          'layout_config must be a valid panel layout object.',
        );
      }
      return normalized as unknown as Record<string, unknown>;
    } catch (error) {
      if (error instanceof PanelLayoutConfigValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.PanelLayoutInvalid,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Relation/membership grids: `panel_type` `table` + `layout_config.dataBinding` `relation`
   * (replaces legacy `panel_type` `related`).
   */
  private isRelationMembershipPanel(panel: ConfigObjectViewPanelEntity): boolean {
    return (
      panel.panelType === 'table' &&
      this.getLayoutConfigDataBinding(panel.layoutConfig) === 'relation'
    );
  }

  private getLayoutConfigDataBinding(
    layoutConfig: Record<string, unknown> | null | undefined,
  ): string | undefined {
    if (
      !layoutConfig ||
      typeof layoutConfig !== 'object' ||
      Array.isArray(layoutConfig)
    ) {
      return undefined;
    }
    const raw = layoutConfig.dataBinding;
    return typeof raw === 'string' ? raw : undefined;
  }

  private assertPanelTypeMatchesDisplayMode(
    panelType: PanelLayoutDisplayMode,
    layoutConfig: Record<string, unknown> | null,
  ): void {
    if (!layoutConfig) {
      return;
    }
    const dm = layoutConfig.displayMode;
    if (typeof dm !== 'string' || !dm) {
      return;
    }
    if (dm !== panelType) {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        `panelType "${panelType}" must match layout_config.displayMode "${dm}".`,
      );
    }
  }

  private assertRelationMembershipPanelLayoutOrThrow(
    panelType: PanelLayoutDisplayMode,
    layoutConfig: Record<string, unknown> | null,
  ): void {
    if (!layoutConfig) {
      return;
    }
    if (layoutConfig.dataBinding !== 'relation') {
      return;
    }
    if (panelType !== 'table') {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'layout_config.dataBinding "relation" requires panelType "table".',
      );
    }
    const displayMode = layoutConfig.displayMode;
    if (displayMode !== 'table') {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'Relation-bound table panels must use displayMode "table".',
      );
    }

    const layout = layoutConfig.layout;
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'Related panels must define membership metadata under layout.',
      );
    }

    const relationKey = (layout as Record<string, unknown>).relationKey;
    if (typeof relationKey !== 'string' || relationKey.trim().length === 0) {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'Related panels must define layout.relationKey.',
      );
    }

    const targetEntityKey = (layout as Record<string, unknown>).targetEntityKey;
    if (
      typeof targetEntityKey !== 'string' ||
      targetEntityKey.trim().length === 0
    ) {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'Related panels must define layout.targetEntityKey.',
      );
    }

    const selectionControl = (layout as Record<string, unknown>).selectionControl;
    if (selectionControl !== 'checkbox' && selectionControl !== 'radio') {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'Related panels must define layout.selectionControl as "checkbox" or "radio".',
      );
    }

    const actions = layoutConfig.actions;
    if (!actions || typeof actions !== 'object' || Array.isArray(actions)) {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'Related panels must define actions with assignRef and unassignRef.',
      );
    }
    const assignRef = (actions as Record<string, unknown>).assignRef;
    const unassignRef = (actions as Record<string, unknown>).unassignRef;
    if (
      typeof assignRef !== 'string' ||
      !assignRef.trim() ||
      typeof unassignRef !== 'string' ||
      !unassignRef.trim()
    ) {
      throw authoringRpcException(
        AuthoringErrorCode.PanelLayoutInvalid,
        'Related panel actions must include non-empty assignRef and unassignRef.',
      );
    }
  }

  private normalizeDetailFormViewConfigJsonOrThrow(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    try {
      const normalized = validateAndNormalizeDetailFormViewConfigJson(value);
      if (!normalized) {
        throw authoringRpcException(
          AuthoringErrorCode.ViewDetailFormConfigInvalid,
          'detail/form view config must be a valid object.',
        );
      }
      return normalized as unknown as Record<string, unknown>;
    } catch (error) {
      if (error instanceof DetailFormViewConfigValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.ViewDetailFormConfigInvalid,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * B-1: reject inline field-definition bundles on scoped view saves; fields must use field CRUD.
   */
  private assertNoForbiddenInlineFieldAuthoringKeysInViewConfig(
    configJson: Record<string, unknown>,
  ): void {
    for (const key of ConfigObjectsService.FORBIDDEN_VIEW_CONFIG_INLINE_FIELD_KEYS) {
      const v = configJson[key];
      if (v !== undefined && v !== null && Array.isArray(v) && v.length > 0) {
        throw authoringRpcException(
          AuthoringErrorCode.FieldInlineBundleForbidden,
          `View config must not embed "${key}"; define fields via config object field CRUD APIs instead.`,
        );
      }
    }
  }

  private extractDetailFormPanelKeysFromConfigJson(
    configJson: Record<string, unknown> | null,
  ): string[] {
    if (!configJson) {
      return [];
    }
    const panels = configJson.panels;
    if (!Array.isArray(panels)) {
      return [];
    }
    return panels
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      .map((p) => p.trim());
  }

  private extractFieldKeysFromPanelLayout(
    panel: ConfigObjectViewPanelEntity,
  ): string[] {
    if (this.isRelationMembershipPanel(panel)) {
      return [];
    }
    if (
      panel.layoutConfig === null ||
      typeof panel.layoutConfig !== 'object' ||
      Array.isArray(panel.layoutConfig)
    ) {
      return [];
    }
    const out = new Set<string>();
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
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (
          ['field', 'fieldKey', 'timeField', 'groupBy'].includes(key) &&
          typeof value === 'string' &&
          value.trim().length > 0
        ) {
          out.add(value.trim());
        } else if (
          ['columns', 'cardFields', 'keyValueFields', 'fieldOrder', 'eventFields'].includes(
            key,
          ) &&
          Array.isArray(value)
        ) {
          for (const entry of value) {
            if (typeof entry === 'string' && entry.trim().length > 0) {
              out.add(entry.trim());
            }
          }
        }
        visit(value);
      }
    };
    visit(panel.layoutConfig);
    return Array.from(out.values());
  }

  private async assertFormViewWriteSchemaConstraints(params: {
    tenantId: number | null;
    entityKey: string;
    configObjectViewId: number;
    configJson: Record<string, unknown> | null;
  }): Promise<void> {
    const panelKeys = this.extractDetailFormPanelKeysFromConfigJson(params.configJson);
    if (!panelKeys.length) {
      return;
    }
    const schema = await this.getObjectSchema(params.tenantId, params.entityKey);
    if (!schema) {
      throw authoringRpcException(
        AuthoringErrorCode.ViewSchemaUnavailable,
        'Unable to resolve schema for form write-schema validation.',
      );
    }

    const panels = await this.panelRepository.find({
      where: {
        configObjectViewId: params.configObjectViewId,
        panelKey: In(panelKeys),
      },
    });
    const configuredFieldKeys = new Set<string>(
      panels.flatMap((panel) => this.extractFieldKeysFromPanelLayout(panel)),
    );
    const fieldRegistryByKey = new Map(
      schema.fieldRegistry.map((field) => [field.fieldKey, field] as const),
    );

    const nonWritableFields: string[] = [];
    for (const fieldKey of configuredFieldKeys) {
      const descriptor = fieldRegistryByKey.get(fieldKey);
      if (!descriptor) {
        continue;
      }
      if (descriptor.canCreate === false && descriptor.canUpdate === false) {
        nonWritableFields.push(fieldKey);
      }
    }
    if (nonWritableFields.length > 0) {
      throw authoringRpcException(
        AuthoringErrorCode.ViewDetailFormConfigInvalid,
        `Form panels reference non-writable fields: ${nonWritableFields.join(', ')}`,
      );
    }

    const requiredFields = schema.fieldRegistry
      .filter(
        (field) =>
          (field.requiredOnCreate === true || field.requiredOnUpdate === true) &&
          !(field.canCreate === false && field.canUpdate === false),
      )
      .map((field) => field.fieldKey);
    const missingRequired = requiredFields.filter(
      (fieldKey) => !configuredFieldKeys.has(fieldKey),
    );
    if (missingRequired.length > 0) {
      throw authoringRpcException(
        AuthoringErrorCode.ViewDetailFormConfigInvalid,
        `Form panels must include required writable fields: ${missingRequired.join(', ')}`,
      );
    }

    const requiredInlineRelationshipKeys = (schema.relations ?? [])
      .filter((relation) => {
        if (!relation.queryConfig || typeof relation.queryConfig !== 'object') {
          return false;
        }
        const inlineRelation = (relation.queryConfig as Record<string, unknown>)
          .inlineRelation;
        if (
          !inlineRelation ||
          typeof inlineRelation !== 'object' ||
          Array.isArray(inlineRelation)
        ) {
          return false;
        }
        const mode = (inlineRelation as Record<string, unknown>).mode;
        return mode === 'inline_required';
      })
      .map((relation) => relation.relationshipKey);

    if (!requiredInlineRelationshipKeys.length) {
      return;
    }

    const coveredRelationKeys = new Set<string>();
    for (const panel of panels) {
      if (!this.isRelationMembershipPanel(panel)) {
        continue;
      }
      if (panelKeys.includes(panel.panelKey)) {
        coveredRelationKeys.add(panel.panelKey);
      }
      if (
        panel.layoutConfig &&
        typeof panel.layoutConfig === 'object' &&
        !Array.isArray(panel.layoutConfig)
      ) {
        const relationKey = (panel.layoutConfig as Record<string, unknown>).relationKey;
        if (typeof relationKey === 'string' && relationKey.trim().length > 0) {
          coveredRelationKeys.add(relationKey.trim());
        }
      }
    }

    const missingInlineRequired = requiredInlineRelationshipKeys.filter(
      (key) => !coveredRelationKeys.has(key),
    );
    if (missingInlineRequired.length > 0) {
      throw authoringRpcException(
        AuthoringErrorCode.ViewDetailFormConfigInvalid,
        `Form panels must include inline_required relationships: ${missingInlineRequired.join(', ')}`,
      );
    }
  }

  /**
   * B-3: every `panels[]` entry must match a `config_object_view_panels.panel_key` on this view.
   */
  private async assertPanelKeysExistForView(
    configObjectViewId: number,
    panelKeys: string[],
  ): Promise<void> {
    if (!panelKeys.length) {
      return;
    }
    const rows = await this.panelRepository.find({
      where: { configObjectViewId },
      select: ['panelKey'],
    });
    const existing = new Set(rows.map((r) => r.panelKey));
    const missing = panelKeys.filter((k) => !existing.has(k));
    if (missing.length > 0) {
      throw authoringRpcException(
        AuthoringErrorCode.ViewPanelKeyUnknown,
        `View config references unknown panel keys (no matching panel rows on this view): ${missing.join(', ')}`,
      );
    }
  }

  /**
   * B-3: optional diagnostic when DB panels exist that are not listed in `config_json.panels`.
   */
  private async warnOrphanPanelsForDetailFormViewIfNeeded(
    view: ConfigObjectViewEntity,
  ): Promise<void> {
    if (view.viewType !== 'detail' && view.viewType !== 'form') {
      return;
    }
    const cfg = view.configJson;
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
      return;
    }
    const panels = cfg.panels;
    if (!Array.isArray(panels) || panels.length === 0) {
      return;
    }
    const configured = new Set(
      panels
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim()),
    );
    const rows = await this.panelRepository.find({
      where: { configObjectViewId: view.configObjectViewId },
      select: ['panelKey'],
    });
    const orphans = rows
      .map((r) => r.panelKey)
      .filter((key) => !configured.has(key));
    if (orphans.length > 0) {
      this.logger.warn(
        `detail/form view ${view.configObjectViewId} has panel rows not referenced in config_json.panels: ${orphans.join(', ')}`,
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
    const fieldRegistry = finalizeCoreFieldDescriptors({
      bindingMode: schema.configObject.bindingMode,
      objectType: schema.configObject.objectType,
      fieldViews: schema.fields,
    });
    const base: ConfigObjectRunnerSchemaView = {
      ...schema,
      ...meta,
      fieldRegistry,
      fieldMergePolicy: CONFIG_OBJECT_FIELD_MERGE_POLICY,
      sorFieldDescriptors: [],
      mergedFieldOrder: [],
    };
    return this.attachMergedFieldOrder(base);
  }

  private async loadFieldViewsForConfigObjectId(
    configObjectId: number,
  ): Promise<ConfigObjectFieldView[]> {
    const fields = await this.configObjectFieldRepository.find({
      where: {
        configObjectId,
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

    return fields.map((field) => ({
      field,
      rules: (rulesByFieldId.get(field.configObjectFieldId) ?? []).map(
        (fieldRule) => ({ fieldRule }),
      ),
    }));
  }

  private async buildRelatedFieldRegistryByRelationKey(
    relations: RelationDescriptor[],
    templateSetId: number,
  ): Promise<{
    relatedFieldRegistryByRelationKey: Record<string, CoreFieldDescriptor[]>;
    relatedFieldRegistrySourceByRelationKey: Record<
      string,
      'configured_object' | 'entity_fallback' | 'unavailable'
    >;
  }> {
    const out: Record<string, CoreFieldDescriptor[]> = {};
    const sourceByRelationshipKey: Record<
      string,
      'configured_object' | 'entity_fallback' | 'unavailable'
    > = {};

    for (const rel of relations) {
      const targetConfigObject = await this.configObjectRepository.findOne({
        where: {
          configTemplateSetId: templateSetId,
          objectType: rel.toObjectType,
        },
      });
      if (!targetConfigObject) {
        const inferredBindingMode = inferDefaultBindingModeForObjectType(
          rel.toObjectType,
        );
        if (!inferredBindingMode) {
          out[rel.relationshipKey] = [];
          sourceByRelationshipKey[rel.relationshipKey] = 'unavailable';
          continue;
        }
        out[rel.relationshipKey] = finalizeCoreFieldDescriptors({
          bindingMode: inferredBindingMode,
          objectType: rel.toObjectType,
          fieldViews: [],
        });
        sourceByRelationshipKey[rel.relationshipKey] = 'entity_fallback';
        continue;
      }

      const targetFieldViews = await this.loadFieldViewsForConfigObjectId(
        targetConfigObject.configObjectId,
      );
      out[rel.relationshipKey] = finalizeCoreFieldDescriptors({
        bindingMode: targetConfigObject.bindingMode,
        objectType: targetConfigObject.objectType,
        fieldViews: targetFieldViews,
      });
      sourceByRelationshipKey[rel.relationshipKey] = 'configured_object';
    }

    return {
      relatedFieldRegistryByRelationKey: out,
      relatedFieldRegistrySourceByRelationKey: sourceByRelationshipKey,
    };
  }

  private async attachRelationCatalog(
    schema: ConfigObjectRunnerSchemaView,
    templateSetId: number,
  ): Promise<ConfigObjectRunnerSchemaView> {
    const relations = await this.getMergedRelationshipCatalogForObjectType(
      schema.configObject.objectType,
    );
    const {
      relatedFieldRegistryByRelationKey,
      relatedFieldRegistrySourceByRelationKey,
    } =
      await this.buildRelatedFieldRegistryByRelationKey(relations, templateSetId);
    const relationManifestsByKey = Object.fromEntries(
      relations.map((rel) => [
        rel.relationshipKey,
        rel.relationManifestJson ?? null,
      ]),
    );

    return {
      ...schema,
      relations,
      relatedFieldRegistryByRelationKey,
      relatedFieldRegistrySourceByRelationKey,
      relationManifestsByKey,
    };
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
    this.clearExpiredRuntimeCaches();
    const cacheKey = this.getSchemaCacheKey(effectiveTenantId, objectType);
    const cached = this.schemaCache.get(cacheKey);
    if (cached && this.isFresh(cached.expiresAt)) {
      return cached.value;
    }

    const where =
      effectiveTenantId === null
        ? { status: 'PUBLISHED' as const }
        : { tenantId: effectiveTenantId, status: 'PUBLISHED' as const };

    const templateSet = await this.templateSetRepository.findOne({
      where,
      order: { configTemplateSetId: 'ASC' },
    });

    if (!templateSet) {
      this.schemaCache.set(cacheKey, {
        expiresAt: Date.now() + this.runtimeCacheTtlMs,
        value: null,
      });
      return null;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configTemplateSetId: templateSet.configTemplateSetId,
        objectType,
      },
    });

    if (!configObject) {
      this.schemaCache.set(cacheKey, {
        expiresAt: Date.now() + this.runtimeCacheTtlMs,
        value: null,
      });
      return null;
    }

    const fieldViews = await this.loadFieldViewsForConfigObjectId(
      configObject.configObjectId,
    );

    const base = this.enrichSchemaViewWithRunner({
      configObject,
      fields: fieldViews,
    });
    const schema = await this.attachRelationCatalog(base, templateSet.configTemplateSetId);
    this.schemaCache.set(cacheKey, {
      expiresAt: Date.now() + this.runtimeCacheTtlMs,
      value: schema,
    });
    return schema;
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
    const canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(objectType);

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

    const existingRows = await this.configObjectRepository.find({
      where: {
        configTemplateSetId,
      },
    });
    const existing = existingRows.find(
      (row) =>
        this.normalizeCanonicalObjectTypeOrThrow(row.objectType) ===
        canonicalObjectType,
    );

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
      objectType: canonicalObjectType,
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
    objectType?: string;
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
      objectType,
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
      objectType: existing.objectType,
      displayName: existing.displayName,
      description: existing.description ?? null,
      status: existing.status,
      bindingMode: existing.bindingMode,
      sorTableName: existing.sorTableName,
    };

    const nextMode =
      typeof bindingMode === 'string' ? bindingMode : existing.bindingMode;
    const nextObjectType =
      typeof objectType === 'string'
        ? this.normalizeCanonicalObjectTypeOrThrow(objectType)
        : this.normalizeCanonicalObjectTypeOrThrow(existing.objectType);
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

    if (nextObjectType !== this.normalizeCanonicalObjectTypeOrThrow(existing.objectType)) {
      const siblingRows = await this.configObjectRepository.find({
        where: { configTemplateSetId: existing.configTemplateSetId },
      });
      const duplicate = siblingRows.some(
        (row) =>
          row.configObjectId !== existing.configObjectId &&
          this.normalizeCanonicalObjectTypeOrThrow(row.objectType) ===
            nextObjectType,
      );
      if (duplicate) {
        throw new RpcException(
          `Config object with type "${nextObjectType}" already exists in template set.`,
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
    existing.objectType = nextObjectType;
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
        objectType: saved.objectType,
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
      validationJson: this.applyDerivedDisplayAuthoringInValidationJson(
        typeof validationJson === 'undefined' ? null : validationJson,
      ),
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
      existing.validationJson = this.applyDerivedDisplayAuthoringInValidationJson(
        validationJson,
      );
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

  private normalizeFieldRulesJson(
    rulesJson: unknown,
  ): Record<string, unknown> | null {
    if (rulesJson === undefined) {
      return null;
    }
    if (rulesJson === null) {
      return null;
    }
    if (typeof rulesJson !== 'object' || Array.isArray(rulesJson)) {
      throw new RpcException('rulesJson must be a plain object or null.');
    }
    return rulesJson as Record<string, unknown>;
  }

  /**
   * Lists field-rule rows for one config field, scoped to tenant.
   */
  async listConfigFieldRules(params: {
    tenantId: number | null | undefined;
    configObjectFieldId: number;
  }): Promise<ConfigObjectFieldRuleEntity[]> {
    const { tenantId, configObjectFieldId } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const field = await this.configObjectFieldRepository.findOne({
      where: { configObjectFieldId },
    });
    if (!field) {
      return [];
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: field.configObjectId },
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
        'Config field does not belong to the specified tenant.',
      );
    }

    return this.configObjectFieldRuleRepository.find({
      where: { configObjectFieldId },
      order: {
        lifecycleStateKey: 'ASC',
        roleKey: 'ASC',
        configObjectFieldRuleId: 'ASC',
      },
    });
  }

  /**
   * Creates one field-rule row and logs the change.
   */
  async createConfigFieldRule(params: {
    tenantId: number | null | undefined;
    configObjectFieldId: number;
    createdBy: number;
    lifecycleStateKey?: string | null;
    roleKey?: string | null;
    isVisible?: boolean;
    isReadonly?: boolean;
    isRequired?: boolean;
    rulesJson?: Record<string, unknown> | null;
  }): Promise<ConfigObjectFieldRuleEntity> {
    const {
      tenantId,
      configObjectFieldId,
      createdBy,
      lifecycleStateKey,
      roleKey,
      isVisible,
      isReadonly,
      isRequired,
      rulesJson,
    } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const field = await this.configObjectFieldRepository.findOne({
      where: { configObjectFieldId },
    });
    if (!field) {
      throw new RpcException('Config field not found.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: field.configObjectId },
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
        'Config field does not belong to the specified tenant.',
      );
    }

    this.assertConfigObjectAllowsDesignerFields(configObject);

    const existing = await this.configObjectFieldRuleRepository.findOne({
      where: {
        configObjectFieldId,
        lifecycleStateKey: lifecycleStateKey ?? IsNull(),
        roleKey: roleKey ?? IsNull(),
      },
    });
    if (existing) {
      throw new RpcException(
        'A field rule already exists for this field + lifecycle + role scope.',
      );
    }

    const row = this.configObjectFieldRuleRepository.create({
      configObjectFieldId,
      lifecycleStateKey: lifecycleStateKey ?? null,
      roleKey: roleKey ?? null,
      isVisible: typeof isVisible === 'boolean' ? isVisible : true,
      isReadonly: typeof isReadonly === 'boolean' ? isReadonly : false,
      isRequired: typeof isRequired === 'boolean' ? isRequired : false,
      rulesJson: this.normalizeFieldRulesJson(rulesJson),
    });

    const saved = await this.configObjectFieldRuleRepository.save(row);

    await this.logConfigChange(
      effectiveTenantId,
      'field_rule',
      saved.configObjectFieldRuleId,
      'create',
      createdBy,
      null,
      {
        configObjectFieldId: saved.configObjectFieldId,
        lifecycleStateKey: saved.lifecycleStateKey ?? null,
        roleKey: saved.roleKey ?? null,
        isVisible: saved.isVisible,
        isReadonly: saved.isReadonly,
        isRequired: saved.isRequired,
        rulesJson: saved.rulesJson ?? null,
      },
    );

    return saved;
  }

  /**
   * Updates one field-rule row and logs the change.
   */
  async updateConfigFieldRule(params: {
    tenantId: number | null | undefined;
    configObjectFieldRuleId: number;
    updatedBy: number;
    lifecycleStateKey?: string | null;
    roleKey?: string | null;
    isVisible?: boolean;
    isReadonly?: boolean;
    isRequired?: boolean;
    rulesJson?: Record<string, unknown> | null;
  }): Promise<ConfigObjectFieldRuleEntity> {
    const {
      tenantId,
      configObjectFieldRuleId,
      updatedBy,
      lifecycleStateKey,
      roleKey,
      isVisible,
      isReadonly,
      isRequired,
      rulesJson,
    } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.configObjectFieldRuleRepository.findOne({
      where: { configObjectFieldRuleId },
    });
    if (!existing) {
      throw new RpcException('Config field rule not found.');
    }

    const field = await this.configObjectFieldRepository.findOne({
      where: { configObjectFieldId: existing.configObjectFieldId },
    });
    if (!field) {
      throw new RpcException('Config field not found for field rule.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: field.configObjectId },
    });
    if (!configObject) {
      throw new RpcException('Config object not found for field rule.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });
    if (!templateSet) {
      throw new RpcException(
        'Config field rule does not belong to the specified tenant.',
      );
    }

    this.assertConfigObjectAllowsDesignerFields(configObject);

    const oldValue = {
      lifecycleStateKey: existing.lifecycleStateKey ?? null,
      roleKey: existing.roleKey ?? null,
      isVisible: existing.isVisible,
      isReadonly: existing.isReadonly,
      isRequired: existing.isRequired,
      rulesJson: existing.rulesJson ?? null,
    };

    if (typeof lifecycleStateKey !== 'undefined') {
      existing.lifecycleStateKey = lifecycleStateKey;
    }
    if (typeof roleKey !== 'undefined') {
      existing.roleKey = roleKey;
    }
    if (typeof isVisible === 'boolean') {
      existing.isVisible = isVisible;
    }
    if (typeof isReadonly === 'boolean') {
      existing.isReadonly = isReadonly;
    }
    if (typeof isRequired === 'boolean') {
      existing.isRequired = isRequired;
    }
    if (typeof rulesJson !== 'undefined') {
      existing.rulesJson = this.normalizeFieldRulesJson(rulesJson);
    }

    const duplicate = await this.configObjectFieldRuleRepository.findOne({
      where: {
        configObjectFieldId: existing.configObjectFieldId,
        lifecycleStateKey: existing.lifecycleStateKey ?? IsNull(),
        roleKey: existing.roleKey ?? IsNull(),
      },
    });
    if (
      duplicate &&
      duplicate.configObjectFieldRuleId !== existing.configObjectFieldRuleId
    ) {
      throw new RpcException(
        'A field rule already exists for this field + lifecycle + role scope.',
      );
    }

    const saved = await this.configObjectFieldRuleRepository.save(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'field_rule',
      saved.configObjectFieldRuleId,
      'update',
      updatedBy,
      oldValue,
      {
        lifecycleStateKey: saved.lifecycleStateKey ?? null,
        roleKey: saved.roleKey ?? null,
        isVisible: saved.isVisible,
        isReadonly: saved.isReadonly,
        isRequired: saved.isRequired,
        rulesJson: saved.rulesJson ?? null,
      },
    );

    return saved;
  }

  /**
   * Deletes one field-rule row and logs the change.
   */
  async deleteConfigFieldRule(params: {
    tenantId: number | null | undefined;
    configObjectFieldRuleId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectFieldRuleId, deletedBy } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const existing = await this.configObjectFieldRuleRepository.findOne({
      where: { configObjectFieldRuleId },
    });
    if (!existing) {
      return;
    }

    const field = await this.configObjectFieldRepository.findOne({
      where: { configObjectFieldId: existing.configObjectFieldId },
    });
    if (!field) {
      throw new RpcException('Config field not found for field rule.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: field.configObjectId },
    });
    if (!configObject) {
      throw new RpcException('Config object not found for field rule.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });
    if (!templateSet) {
      throw new RpcException(
        'Config field rule does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      configObjectFieldId: existing.configObjectFieldId,
      lifecycleStateKey: existing.lifecycleStateKey ?? null,
      roleKey: existing.roleKey ?? null,
      isVisible: existing.isVisible,
      isReadonly: existing.isReadonly,
      isRequired: existing.isRequired,
      rulesJson: existing.rulesJson ?? null,
    };

    await this.configObjectFieldRuleRepository.remove(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'field_rule',
      configObjectFieldRuleId,
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

  private applyDerivedDisplayAuthoringInValidationJson(
    validationJson: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    if (!validationJson) {
      return null;
    }
    try {
      const next = { ...validationJson };
      if (
        Object.prototype.hasOwnProperty.call(next, '_six1DerivedDisplayAuthoring')
      ) {
        next._six1DerivedDisplayAuthoring = validateDerivedDisplayAuthoringMetadata(
          next._six1DerivedDisplayAuthoring,
        );
      }
      if (Object.prototype.hasOwnProperty.call(next, '_six1LookupSelectAuthoring')) {
        next._six1LookupSelectAuthoring = validateLookupSelectAuthoringMetadata(
          next._six1LookupSelectAuthoring,
        );
      }
      if (
        Object.prototype.hasOwnProperty.call(next, '_six1DerivedRuntimeAuthoring')
      ) {
        next._six1DerivedRuntimeAuthoring = validateDerivedRuntimeAuthoringMetadata(
          next._six1DerivedRuntimeAuthoring,
        );
      }
      return next;
    } catch (error) {
      if (error instanceof DerivedDisplayAuthoringValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.DerivedDisplayInvalid,
          error.message,
        );
      }
      if (error instanceof LookupSelectAuthoringValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.LookupSelectInvalid,
          error.message,
        );
      }
      if (error instanceof DerivedRuntimeAuthoringValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.DerivedRuntimeInvalid,
          error.message,
        );
      }
      throw error;
    }
  }

  private safeNormalizeQueryConfigForRelationship(
    queryConfig: Record<string, unknown>,
  ): Record<string, unknown> {
    try {
      return normalizeQueryConfigInlineRelation({ ...queryConfig });
    } catch (error) {
      mapRelationAuthoringErrorToRpc(error);
    }
  }

  private safeNormalizeRelationManifestsJson(
    value: unknown | null | undefined,
  ): Record<string, unknown> | null {
    try {
      const normalized = validateAndNormalizeRelationManifestsByKey(value);
      return normalized as unknown as Record<string, unknown> | null;
    } catch (error) {
      mapRelationAuthoringErrorToRpc(error);
    }
  }

  private async assertRelationshipEndpointsPublishedInScope(
    tenantId: number | null | undefined,
    fromObjectType: string,
    toObjectType: string,
  ): Promise<void> {
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const templateSetWhere =
      effectiveTenantId === null
        ? { status: 'PUBLISHED' as const }
        : { tenantId: effectiveTenantId, status: 'PUBLISHED' as const };
    const templateSet = await this.templateSetRepository.findOne({
      where: templateSetWhere,
      order: { configTemplateSetId: 'ASC' },
    });
    if (!templateSet) {
      throw authoringRpcException(
        AuthoringErrorCode.RelationPublishedEndpoints,
        'No active published template set found for relationship authoring scope.',
      );
    }

    const [from, to] = await Promise.all([
      this.configObjectRepository.findOne({
        where: {
          configTemplateSetId: templateSet.configTemplateSetId,
          objectType: fromObjectType,
          status: 'PUBLISHED',
        },
      }),
      this.configObjectRepository.findOne({
        where: {
          configTemplateSetId: templateSet.configTemplateSetId,
          objectType: toObjectType,
          status: 'PUBLISHED',
        },
      }),
    ]);
    if (!from) {
      throw authoringRpcException(
        AuthoringErrorCode.RelationPublishedEndpoints,
        `fromObjectType "${fromObjectType}" must be a PUBLISHED configurable object.`,
      );
    }
    if (!to) {
      throw authoringRpcException(
        AuthoringErrorCode.RelationPublishedEndpoints,
        `toObjectType "${toObjectType}" must be a PUBLISHED configurable object.`,
      );
    }
  }

  private async getMergedRelationshipCatalogForObjectType(
    objectType: string,
  ): Promise<RelationDescriptor[]> {
    const ormRows = generateOrmRelationDescriptorsForObjectType(objectType);
    const designerRows = await this.relationshipRepository.find({
      where: {
        fromObjectType: objectType,
        isActive: true,
      },
    });

    const byKey = new Map<string, RelationDescriptor>();
    for (const row of ormRows) {
      byKey.set(row.relationshipKey, row);
    }

    for (const row of designerRows) {
      if (byKey.has(row.relationshipKey)) {
        throw authoringRpcException(
          AuthoringErrorCode.RelationConfigInvalid,
          `Duplicate relationship key "${row.relationshipKey}" exists in both orm and designer catalogs for "${objectType}".`,
        );
      }
      byKey.set(row.relationshipKey, {
        fromObjectType: row.fromObjectType,
        toObjectType: row.toObjectType,
        relationshipKey: row.relationshipKey,
        displayName: row.displayName,
        cardinality: row.cardinality,
        relationshipSource: row.relationshipSource ?? 'designer',
        isActive: !!row.isActive,
        queryConfig: row.queryConfig ?? {},
        relationManifestJson:
          (row.relationManifestJson as Record<string, unknown> | null) ?? null,
      });
    }

    return Array.from(byKey.values()).sort((a, b) =>
      a.relationshipKey.localeCompare(b.relationshipKey),
    );
  }

  /**
   * Related-field catalog for a relationship (`toObjectType` field keys from schema).
   */
  async getRelatedFieldCatalogForRelationship(params: {
    tenantId: number | null | undefined;
    fromObjectType: string;
    relationshipKey: string;
  }): Promise<{
    fromObjectType: string;
    relationshipKey: string;
    toObjectType: string;
    cardinality: string;
    relationshipSource: 'orm' | 'designer';
    fieldKeys: string[];
  }> {
    const merged = await this.getMergedRelationshipCatalogForObjectType(
      params.fromObjectType,
    );
    const rel =
      merged.find((r) => r.relationshipKey === params.relationshipKey) ?? null;
    if (!rel) {
      throw authoringRpcException(
        AuthoringErrorCode.RelationCatalogNotFound,
        'Relationship not found for catalog lookup.',
      );
    }
    const effectiveTenantId = this.getEffectiveTenantId(params.tenantId);
    const schema = await this.getObjectSchema(effectiveTenantId, rel.toObjectType);
    const fieldKeys = schema?.fields.map((v) => v.field.fieldKey) ?? [];
    return {
      fromObjectType: rel.fromObjectType,
      relationshipKey: rel.relationshipKey,
      toObjectType: rel.toObjectType,
      cardinality: rel.cardinality,
      relationshipSource: rel.relationshipSource,
      fieldKeys,
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
  ): Promise<RelationDescriptor[]> {
    return this.getMergedRelationshipCatalogForObjectType(objectType);
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
    relationshipSource?: 'orm' | 'designer';
    relationManifestsByKey?: Record<string, unknown> | null;
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

    await this.assertRelationshipEndpointsPublishedInScope(
      tenantId,
      fromObjectType,
      toObjectType,
    );

    const relationshipSource =
      params.relationshipSource === 'orm' ? 'orm' : 'designer';
    const normalizedQuery = this.safeNormalizeQueryConfigForRelationship(
      queryConfig as Record<string, unknown>,
    );
    const relationManifestJson =
      params.relationManifestsByKey !== undefined
        ? this.safeNormalizeRelationManifestsJson(params.relationManifestsByKey)
        : null;

    const rel = this.relationshipRepository.create({
      fromObjectType,
      toObjectType,
      relationshipKey,
      relationshipSource,
      displayName,
      cardinality,
      queryConfig: normalizedQuery,
      relationManifestJson,
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
        relationshipSource: saved.relationshipSource,
        displayName: saved.displayName,
        cardinality: saved.cardinality,
        queryConfig: saved.queryConfig,
        relationManifestJson: saved.relationManifestJson ?? null,
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
    relationshipSource?: 'orm' | 'designer';
    relationManifestsByKey?: Record<string, unknown> | null;
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

    await this.assertRelationshipEndpointsPublishedInScope(
      tenantId,
      rel.fromObjectType,
      rel.toObjectType,
    );

    const oldValue = {
      displayName: rel.displayName,
      cardinality: rel.cardinality,
      queryConfig: rel.queryConfig,
      isActive: rel.isActive,
      relationshipSource: rel.relationshipSource,
      relationManifestJson: rel.relationManifestJson ?? null,
    };

    if (typeof displayName === 'string') {
      rel.displayName = displayName;
    }
    if (typeof cardinality === 'string') {
      rel.cardinality = cardinality;
    }
    if (typeof queryConfig !== 'undefined') {
      const base =
        queryConfig !== null &&
        typeof queryConfig === 'object' &&
        !Array.isArray(queryConfig)
          ? (queryConfig as Record<string, unknown>)
          : {};
      rel.queryConfig = this.safeNormalizeQueryConfigForRelationship(base);
    }
    if (typeof params.relationshipSource === 'string') {
      rel.relationshipSource =
        params.relationshipSource === 'orm' ? 'orm' : 'designer';
    }
    if (params.relationManifestsByKey !== undefined) {
      rel.relationManifestJson = this.safeNormalizeRelationManifestsJson(
        params.relationManifestsByKey,
      ) as unknown as Record<string, unknown> | null;
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
        relationshipSource: saved.relationshipSource,
        relationManifestJson: saved.relationManifestJson ?? null,
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

    await this.assertRelationshipEndpointsPublishedInScope(
      tenantId,
      rel.fromObjectType,
      rel.toObjectType,
    );

    const oldValue = {
      fromObjectType: rel.fromObjectType,
      toObjectType: rel.toObjectType,
      relationshipKey: rel.relationshipKey,
      displayName: rel.displayName,
      cardinality: rel.cardinality,
      queryConfig: rel.queryConfig,
      isActive: rel.isActive,
      relationshipSource: rel.relationshipSource,
      relationManifestJson: rel.relationManifestJson ?? null,
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
    viewType: ConfigObjectViewType;
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

  /**
   * Read-safe: returns a `config_object` visible in the tenant/global scope, or `null`
   * when the type is unknown or not accessible (avoids 500s on list-only view reads).
   */
  private async tryResolveConfigObjectForEntityScope(params: {
    entityKey: string;
    effectiveTenantId: number | null;
  }): Promise<ConfigObjectEntity | null> {
    const { entityKey, effectiveTenantId } = params;

    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType: entityKey,
      },
    });

    if (!configObject) {
      return null;
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      return null;
    }

    return configObject;
  }

  /** Write / strict resolution; throws when the entity is unknown or tenant scope mismatches. */
  private async resolveConfigObjectForEntityScope(params: {
    entityKey: string;
    effectiveTenantId: number | null;
  }): Promise<ConfigObjectEntity> {
    const { entityKey } = params;
    const configObject = await this.tryResolveConfigObjectForEntityScope(params);

    if (!configObject) {
      const probe = await this.configObjectRepository.findOne({
        where: { objectType: entityKey },
      });
      if (!probe) {
        throw new RpcException(`Config object not found for entityKey "${entityKey}".`);
      }
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    return configObject;
  }

  private async deactivateViewsInScope(params: {
    configObjectId: number;
    viewType: ConfigObjectViewType;
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
    viewType: ConfigObjectViewType;
  }): Promise<ConfigObjectViewEntity | null> {
    const { tenantId, entityKey, viewType } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    this.clearExpiredRuntimeCaches();
    const cacheKey = this.getActiveViewCacheKey({
      tenantId: effectiveTenantId,
      entityKey,
      viewType,
    });
    const cached = this.activeViewCache.get(cacheKey);
    if (cached && this.isFresh(cached.expiresAt)) {
      return cached.value;
    }

    const configObject = await this.tryResolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
    });

    if (!configObject) {
      this.activeViewCache.set(cacheKey, {
        expiresAt: Date.now() + this.runtimeCacheTtlMs,
        value: null,
      });
      return null;
    }

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
        this.activeViewCache.set(cacheKey, {
          expiresAt: Date.now() + this.runtimeCacheTtlMs,
          value: tenantScoped,
        });
        return tenantScoped;
      }
    }

    const fallback = await this.viewRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        viewType,
        tenantId: IsNull(),
        isActive: true,
      },
      order: { configObjectViewId: 'DESC' },
    });
    this.activeViewCache.set(cacheKey, {
      expiresAt: Date.now() + this.runtimeCacheTtlMs,
      value: fallback,
    });
    return fallback;
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

    const configObject = await this.tryResolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
    });

    if (!configObject) {
      return [];
    }

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
   * Returns runtime-manifest payload with resolved list/detail/form sections.
   * This is the runtime read contract used by Object Runner composition.
   */
  async getRuntimeManifest(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    includeDiagnostics?: boolean;
  }): Promise<ConfigObjectRuntimeManifestView> {
    const { tenantId, entityKey, includeDiagnostics = true } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    this.clearExpiredRuntimeCaches();
    const cacheKey = this.getRuntimeManifestCacheKey({
      tenantId: effectiveTenantId,
      entityKey,
      includeDiagnostics,
    });
    const cached = this.runtimeManifestCache.get(cacheKey);
    if (cached && this.isFresh(cached.expiresAt)) {
      return cached.value;
    }
    const schema = await this.getObjectSchema(effectiveTenantId, entityKey);

    if (!schema) {
      const missingSchemaResult: ConfigObjectRuntimeManifestView = {
        entityKey,
        tenantId: effectiveTenantId,
        generatedAt: new Date().toISOString(),
        list: null,
        detail: null,
        form: null,
        diagnostics: includeDiagnostics
          ? [
              {
                code: RuntimeErrorCode.SchemaNotFound,
                message: `No published schema found for entityKey "${entityKey}".`,
                level: 'error' as const,
              },
            ]
          : [],
      };
      this.runtimeManifestCache.set(cacheKey, {
        expiresAt: Date.now() + this.runtimeCacheTtlMs,
        value: missingSchemaResult,
      });
      return missingSchemaResult;
    }

    const [listView, detailView, formView] = await Promise.all([
      this.getActiveScopedConfigView({
        tenantId: effectiveTenantId,
        entityKey,
        viewType: 'list',
      }),
      this.getActiveScopedConfigView({
        tenantId: effectiveTenantId,
        entityKey,
        viewType: 'detail',
      }),
      this.getActiveScopedConfigView({
        tenantId: effectiveTenantId,
        entityKey,
        viewType: 'form',
      }),
    ]);

    const diagnostics: RuntimeManifestDiagnostic[] = [];
    if (includeDiagnostics) {
      if (!listView) {
        diagnostics.push({
          code: RuntimeErrorCode.ViewListMissing,
          message: `No active list view found for entityKey "${entityKey}".`,
          level: 'warn',
        });
      }
      if (!detailView) {
        diagnostics.push({
          code: RuntimeErrorCode.ViewDetailMissing,
          message: `No active detail view found for entityKey "${entityKey}".`,
          level: 'warn',
        });
      }
      if (!formView) {
        diagnostics.push({
          code: RuntimeErrorCode.ViewFormMissing,
          message: `No active form view found for entityKey "${entityKey}".`,
          level: 'warn',
        });
      }
    }

    const [listSection, detailSection, formSection] = await Promise.all([
      this.buildRuntimeListSection({
        view: listView,
        schema,
        diagnostics,
      }),
      this.buildRuntimeDetailFormSection({
        viewType: 'detail',
        view: detailView,
        schema,
        diagnostics,
      }),
      this.buildRuntimeDetailFormSection({
        viewType: 'form',
        view: formView,
        schema,
        diagnostics,
      }),
    ]);

    const manifest = {
      entityKey,
      tenantId: effectiveTenantId,
      generatedAt: new Date().toISOString(),
      list: listSection,
      detail: detailSection,
      form: formSection,
      diagnostics,
    };
    this.runtimeManifestCache.set(cacheKey, {
      expiresAt: Date.now() + this.runtimeCacheTtlMs,
      value: manifest,
    });
    return manifest;
  }

  async invalidateRuntimeCaches(params: {
    tenantId?: number | null;
    entityKey?: string;
    includeSchemaCache?: boolean;
    includeViewCache?: boolean;
    includeManifestCache?: boolean;
  }): Promise<RuntimeCacheInvalidationResult> {
    const effectiveTenantId =
      typeof params.tenantId === 'number' ? this.getEffectiveTenantId(params.tenantId) : null;
    const includeSchemaCache = params.includeSchemaCache ?? true;
    const includeViewCache = params.includeViewCache ?? true;
    const includeManifestCache = params.includeManifestCache ?? true;
    const tenantPart = `${effectiveTenantId ?? 'global'}::`;
    const entityPart = params.entityKey ? `::${params.entityKey}` : null;
    const matches = (key: string): boolean => {
      const tenantMatch =
        typeof params.tenantId === 'number' ? key.startsWith(tenantPart) : true;
      const entityMatch = params.entityKey ? key.includes(entityPart as string) : true;
      return tenantMatch && entityMatch;
    };

    const cleared = {
      schema: includeSchemaCache
        ? this.clearCacheByPredicate(this.schemaCache, matches)
        : 0,
      view: includeViewCache
        ? this.clearCacheByPredicate(this.activeViewCache, matches)
        : 0,
      manifest: includeManifestCache
        ? this.clearCacheByPredicate(this.runtimeManifestCache, matches)
        : 0,
    };

    return {
      ttlMs: this.runtimeCacheTtlMs,
      cleared,
    };
  }

  async composeRuntimeSubmitPayload(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    operation: 'create' | 'update';
    fieldValues: Record<string, unknown>;
    relationBlocks?: Record<string, unknown>;
  }): Promise<RuntimeComposedSubmitPayloadView> {
    const { tenantId, entityKey, operation, fieldValues } = params;
    const relationBlocks = params.relationBlocks ?? {};
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const schema = await this.getObjectSchema(effectiveTenantId, entityKey);
    if (!schema) {
      throw new RpcException({
        code: RuntimeErrorCode.SchemaNotFound,
        message: `No published schema found for entityKey "${entityKey}".`,
      });
    }

    const payload: Record<string, unknown> = {};
    const deniedFields: string[] = [];
    const missingRequiredFields: string[] = [];
    const byFieldKey = new Map(
      schema.fieldRegistry.map((field) => [field.fieldKey, field] as const),
    );

    for (const [fieldKey, value] of Object.entries(fieldValues ?? {})) {
      const descriptor = byFieldKey.get(fieldKey);
      if (!descriptor) {
        continue;
      }
      const isAllowed =
        operation === 'create'
          ? descriptor.canCreate !== false
          : descriptor.canUpdate !== false;
      if (!isAllowed) {
        deniedFields.push(fieldKey);
        continue;
      }
      if (descriptor.path && descriptor.path.trim().length > 0) {
        this.setValueAtPath(payload, descriptor.path.trim(), value);
      } else {
        payload[fieldKey] = value;
      }
    }

    for (const descriptor of schema.fieldRegistry) {
      const required =
        operation === 'create'
          ? descriptor.requiredOnCreate === true
          : descriptor.requiredOnUpdate === true;
      if (!required) {
        continue;
      }
      const exists = Object.prototype.hasOwnProperty.call(fieldValues ?? {}, descriptor.fieldKey);
      if (!exists) {
        missingRequiredFields.push(descriptor.fieldKey);
      }
    }

    if (deniedFields.length > 0) {
      throw new RpcException({
        code: RuntimeErrorCode.SubmitFieldForbidden,
        message: `Payload includes non-writable fields for ${operation}: ${deniedFields.join(', ')}`,
      });
    }
    if (missingRequiredFields.length > 0) {
      throw new RpcException({
        code: RuntimeErrorCode.SubmitRequiredFieldMissing,
        message: `Missing required fields for ${operation}: ${missingRequiredFields.join(', ')}`,
      });
    }

    const missingRequiredRelations: string[] = [];
    for (const rel of schema.relations ?? []) {
      const relationValue = relationBlocks[rel.relationshipKey];
      if (relationValue !== undefined) {
        this.setValueAtPath(payload, this.getInlineRelationPath(rel), relationValue);
      }
      if (this.isInlineRequiredRelation(rel) && relationValue === undefined) {
        missingRequiredRelations.push(rel.relationshipKey);
      }
    }
    if (missingRequiredRelations.length > 0) {
      throw new RpcException({
        code: RuntimeErrorCode.SubmitRequiredRelationMissing,
        message: `Missing inline_required relation blocks: ${missingRequiredRelations.join(', ')}`,
      });
    }

    return {
      entityKey,
      tenantId: effectiveTenantId,
      operation,
      payload,
    };
  }

  async validateRuntimeRelationAction(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    relationKey: string;
    actionRef: string;
    grantedPermissions: string[];
  }): Promise<RuntimeRelationActionValidationResult> {
    const { tenantId, entityKey, relationKey, actionRef } = params;
    const grantedPermissions = new Set(params.grantedPermissions ?? []);
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const schema = await this.getObjectSchema(effectiveTenantId, entityKey);
    if (!schema) {
      throw new RpcException({
        code: RuntimeErrorCode.SchemaNotFound,
        message: `No published schema found for entityKey "${entityKey}".`,
      });
    }
    const manifestRaw = (schema.relationManifestsByKey ?? {})[relationKey];
    if (!manifestRaw || typeof manifestRaw !== 'object' || Array.isArray(manifestRaw)) {
      throw new RpcException({
        code: RuntimeErrorCode.RelationActionUnknown,
        message: `Relation manifest not found for relationKey "${relationKey}".`,
      });
    }
    const manifest = manifestRaw as Record<string, unknown>;
    const actions =
      manifest.actions && typeof manifest.actions === 'object' && !Array.isArray(manifest.actions)
        ? (manifest.actions as Record<string, unknown>)
        : {};
    const knownActionRefs = Object.values(actions).filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
    if (!knownActionRefs.includes(actionRef)) {
      throw new RpcException({
        code: RuntimeErrorCode.RelationActionUnknown,
        message: `Unknown relation actionRef "${actionRef}" for relation "${relationKey}".`,
      });
    }

    const requiredPermissionsRaw =
      manifest.requiredPermissionsByActionRef &&
      typeof manifest.requiredPermissionsByActionRef === 'object' &&
      !Array.isArray(manifest.requiredPermissionsByActionRef)
        ? (manifest.requiredPermissionsByActionRef as Record<string, unknown>)[actionRef]
        : [];
    const requiredPermissions = Array.isArray(requiredPermissionsRaw)
      ? requiredPermissionsRaw.filter(
          (p): p is string => typeof p === 'string' && p.trim().length > 0,
        )
      : [];
    const missingPermissions = requiredPermissions.filter((p) => !grantedPermissions.has(p));
    const allowed = missingPermissions.length === 0;
    if (!allowed) {
      throw new RpcException({
        code: RuntimeErrorCode.RelationActionForbidden,
        message: `Missing permissions for relation action "${actionRef}": ${missingPermissions.join(', ')}`,
      });
    }
    return {
      entityKey,
      tenantId: effectiveTenantId,
      relationKey,
      actionRef,
      allowed,
      requiredPermissions,
      missingPermissions,
    };
  }

  private getRuntimeCommonResolvedBlock(
    schema: ConfigObjectRunnerSchemaView,
  ): Record<string, unknown> {
    const derivedRuntime = this.buildDerivedRuntimeResolvedBlock(schema);
    return {
      fieldRegistry: schema.fieldRegistry,
      relations: schema.relations ?? [],
      relatedFieldRegistryByRelationKey: schema.relatedFieldRegistryByRelationKey ?? {},
      relationManifestsByKey: schema.relationManifestsByKey ?? {},
      derivedRuntime,
    };
  }

  private buildDerivedRuntimeResolvedBlock(
    schema: ConfigObjectRunnerSchemaView,
  ): Record<string, unknown> {
    const fieldDescriptors = schema.fieldRegistry.filter(
      (field) => field.derivedRuntimeConfig,
    );
    const baseSource: Record<string, unknown> = {};
    for (const fieldView of schema.fields) {
      if (fieldView.field.defaultValue !== null && fieldView.field.defaultValue !== undefined) {
        baseSource[fieldView.field.fieldKey] = fieldView.field.defaultValue as unknown;
      }
    }

    const valuesByFieldKey: Record<string, unknown> = {};
    for (const field of fieldDescriptors) {
      valuesByFieldKey[field.fieldKey] = this.evaluateDerivedRuntimeValue(
        field.derivedRuntimeConfig as CoreFieldDerivedRuntimeConfig,
        baseSource,
      );
    }

    return {
      policy: {
        coalesce: 'first_non_empty_value',
        concat: 'join_non_empty_values',
      },
      fieldKeys: fieldDescriptors.map((field) => field.fieldKey),
      valuesByFieldKey,
    };
  }

  private async buildRuntimeListSection(params: {
    view: ConfigObjectViewEntity | null;
    schema: ConfigObjectRunnerSchemaView;
    diagnostics: RuntimeManifestDiagnostic[];
  }): Promise<RuntimeManifestViewSection | null> {
    const { view, schema, diagnostics } = params;
    if (!view) {
      return null;
    }

    const normalizedList = this.safeNormalizeListViewConfigForRuntime(
      view.configJson,
      diagnostics,
    );
    const commonResolved = this.getRuntimeCommonResolvedBlock(schema);
    const fieldByKey = new Map(
      schema.fieldRegistry.map((field) => [field.fieldKey, field] as const),
    );
    const tableColumns = normalizedList.table?.columns ?? [];
    const tableColumnFieldKeys = listViewColumnFieldKeys(tableColumns);
    const tableActionBindingKeys = listViewActionBindingKeys(
      normalizedList.table?.actions,
    );
    const boardGroupBy = normalizedList.board?.groupByField;
    const boardCardTitle = normalizedList.board?.cardTitleField;
    const boardCardSubtitleFields = normalizedList.board?.cardSubtitleFields ?? [];

    const tableColumnDescriptors = tableColumnFieldKeys
      .map((fieldKey) => fieldByKey.get(fieldKey))
      .filter((descriptor): descriptor is CoreFieldDescriptor => Boolean(descriptor));

    for (const fieldKey of tableColumnFieldKeys) {
      if (!fieldByKey.has(fieldKey)) {
        diagnostics.push({
          code: RuntimeErrorCode.FieldKeyUnresolved,
          message: `List table column field "${fieldKey}" is not in fieldRegistry.`,
          level: 'warn',
          refType: 'fieldKey',
          refKey: fieldKey,
        });
      }
    }
    const boardReferenced = [
      ...(boardGroupBy ? [boardGroupBy] : []),
      ...(boardCardTitle ? [boardCardTitle] : []),
      ...boardCardSubtitleFields,
    ];
    for (const fieldKey of boardReferenced) {
      if (!fieldByKey.has(fieldKey)) {
        diagnostics.push({
          code: RuntimeErrorCode.FieldKeyUnresolved,
          message: `List board field "${fieldKey}" is not in fieldRegistry.`,
          level: 'warn',
          refType: 'fieldKey',
          refKey: fieldKey,
        });
      }
    }

    return {
      viewType: 'list',
      config: normalizedList as unknown as Record<string, unknown>,
      resolved: {
        ...commonResolved,
        defaultPresentation: normalizedList.defaultPresentation ?? 'table',
        table: {
          columns: tableColumns,
          columnFieldKeys: tableColumnFieldKeys,
          columnDescriptors: tableColumnDescriptors,
          defaultSort: normalizedList.table?.defaultSort ?? null,
          rowActions: normalizedList.table?.rowActions ?? [],
          bulkActions: normalizedList.table?.bulkActions ?? [],
          pagination: normalizedList.table?.pagination ?? null,
          filters: normalizedList.table?.filters ?? [],
          actions: normalizedList.table?.actions ?? [],
          actionBindingKeys: tableActionBindingKeys,
        },
        board: {
          groupByField: boardGroupBy ?? null,
          cardTitleField: boardCardTitle ?? null,
          cardSubtitleFields: boardCardSubtitleFields,
          swimlaneOrder: normalizedList.board?.swimlaneOrder ?? [],
        },
      },
    };
  }

  private async buildRuntimeDetailFormSection(params: {
    viewType: ConfigObjectViewType,
    view: ConfigObjectViewEntity | null;
    schema: ConfigObjectRunnerSchemaView;
    diagnostics: RuntimeManifestDiagnostic[];
  }): Promise<RuntimeManifestViewSection | null> {
    const { viewType, view, schema, diagnostics } = params;
    if (!view) {
      return null;
    }

    if (viewType !== 'detail' && viewType !== 'form') {
      return {
        viewType,
        config: view.configJson ?? null,
        resolved: this.getRuntimeCommonResolvedBlock(schema),
      };
    }

    const normalized = this.safeNormalizeDetailFormViewConfigForRuntime(
      view.configJson,
      viewType,
      diagnostics,
    );
    const panelKeys = normalized.panels ?? [];
    const panels = panelKeys.length
      ? await this.panelRepository.find({
          where: {
            configObjectViewId: view.configObjectViewId,
            panelKey: In(panelKeys),
          },
          order: {
            orderIndex: 'ASC',
          },
        })
      : [];
    const panelByKey = new Map(panels.map((panel) => [panel.panelKey, panel]));
    const orderedPanels: ConfigObjectViewPanelEntity[] = [];

    for (const panelKey of panelKeys) {
      const panel = panelByKey.get(panelKey);
      if (!panel) {
        diagnostics.push({
          code: RuntimeErrorCode.PanelKeyUnresolved,
          message: `${viewType} panel "${panelKey}" could not be resolved from config_object_view_panels.`,
          level: 'warn',
          refType: 'panelKey',
          refKey: panelKey,
        });
        continue;
      }
      orderedPanels.push(panel);
    }

    const fieldRegistryByKey = new Set(schema.fieldRegistry.map((f) => f.fieldKey));
    for (const panel of orderedPanels) {
      const panelFieldKeys = this.extractFieldKeysFromPanelLayout(panel);
      for (const fieldKey of panelFieldKeys) {
        if (!fieldRegistryByKey.has(fieldKey)) {
          diagnostics.push({
            code: RuntimeErrorCode.FieldKeyUnresolved,
            message: `${viewType} panel "${panel.panelKey}" references unknown field "${fieldKey}".`,
            level: 'warn',
            refType: 'fieldKey',
            refKey: fieldKey,
          });
        }
      }
      if (this.isRelationMembershipPanel(panel)) {
        const relationKey = this.extractRelationKeyFromPanel(panel);
        if (relationKey && !((schema.relationManifestsByKey ?? {})[relationKey])) {
          diagnostics.push({
            code: RuntimeErrorCode.RelationKeyUnresolved,
            message: `${viewType} panel "${panel.panelKey}" references relation "${relationKey}" without relation manifest metadata.`,
            level: 'warn',
            refType: 'relationKey',
            refKey: relationKey,
          });
        }
      }
    }

    const relationQueryDefaultsByKey: Record<string, unknown> = {};
    for (const [relationKey, manifestBlock] of Object.entries(
      schema.relationManifestsByKey ?? {},
    )) {
      const block =
        manifestBlock && typeof manifestBlock === 'object' && !Array.isArray(manifestBlock)
          ? (manifestBlock as Record<string, unknown>)
          : {};
      relationQueryDefaultsByKey[relationKey] = this.normalizeRuntimeRelationQueryDefaults(
        block.queryDefaults,
        diagnostics,
        relationKey,
      );
    }

    return {
      viewType,
      config: normalized as unknown as Record<string, unknown>,
      resolved: {
        ...this.getRuntimeCommonResolvedBlock(schema),
        panelKeys,
        relationQueryDefaultsByKey,
        panels: orderedPanels.map((panel) => ({
          panelKey: panel.panelKey,
          title: panel.title,
          panelType: panel.panelType,
          orderIndex: panel.orderIndex,
          layoutConfig: panel.layoutConfig ?? null,
        })),
      },
    };
  }

  private safeNormalizeListViewConfigForRuntime(
    value: Record<string, unknown> | null,
    diagnostics: RuntimeManifestDiagnostic[],
  ): ListViewConfig {
    if (!value) {
      return validateAndNormalizeListViewConfigJson(null);
    }
    try {
      return validateAndNormalizeListViewConfigJson(value);
    } catch (error) {
      diagnostics.push({
        code: RuntimeErrorCode.ViewConfigInvalid,
        message:
          error instanceof Error
            ? error.message
            : 'Invalid list config_json; using default fallback.',
        level: 'warn',
      });
      return validateAndNormalizeListViewConfigJson(null);
    }
  }

  private safeNormalizeDetailFormViewConfigForRuntime(
    value: Record<string, unknown> | null,
    viewType: 'detail' | 'form',
    diagnostics: RuntimeManifestDiagnostic[],
  ): DetailFormViewConfig {
    if (!value) {
      return { schemaVersion: 1, panels: [] };
    }
    try {
      return (
        validateAndNormalizeDetailFormViewConfigJson(value) ?? {
          schemaVersion: 1,
          panels: [],
        }
      );
    } catch (error) {
      diagnostics.push({
        code: RuntimeErrorCode.ViewConfigInvalid,
        message:
          error instanceof Error
            ? `${viewType} config_json is invalid: ${error.message}`
            : `${viewType} config_json is invalid; using fallback.`,
        level: 'warn',
      });
      return { schemaVersion: 1, panels: [] };
    }
  }

  private extractRelationKeyFromPanel(
    panel: ConfigObjectViewPanelEntity,
  ): string | null {
    if (
      !panel.layoutConfig ||
      typeof panel.layoutConfig !== 'object' ||
      Array.isArray(panel.layoutConfig)
    ) {
      return null;
    }
    const layout = (panel.layoutConfig as Record<string, unknown>).layout;
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
      return null;
    }
    const relationKey = (layout as Record<string, unknown>).relationKey;
    if (typeof relationKey !== 'string' || relationKey.trim().length === 0) {
      return null;
    }
    return relationKey.trim();
  }

  private normalizeRuntimeRelationQueryDefaults(
    value: unknown,
    diagnostics: RuntimeManifestDiagnostic[],
    relationKey: string,
  ): { page: number; limit: number; depth: number; sort: unknown; filters: unknown } {
    const obj =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    const pageRaw = Number(obj.page);
    const limitRaw = Number(obj.limit);
    const depthRaw = Number(obj.depth);
    let page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    let limit =
      Number.isInteger(limitRaw) && limitRaw >= 1 ? limitRaw : this.runtimeRelationMaxPageSize;
    let depth = Number.isInteger(depthRaw) && depthRaw >= 0 ? depthRaw : 1;

    if (limit > this.runtimeRelationMaxPageSize) {
      diagnostics.push({
        code: RuntimeErrorCode.ViewConfigInvalid,
        message: `relation "${relationKey}" queryDefaults.limit exceeded max (${this.runtimeRelationMaxPageSize}); clamped.`,
        level: 'warn',
        refType: 'relationKey',
        refKey: relationKey,
      });
      limit = this.runtimeRelationMaxPageSize;
    }
    if (depth > this.runtimeRelationMaxDepth) {
      diagnostics.push({
        code: RuntimeErrorCode.RelationQueryDepthExceeded,
        message: `relation "${relationKey}" queryDefaults.depth exceeded max (${this.runtimeRelationMaxDepth}); clamped.`,
        level: 'warn',
        refType: 'relationKey',
        refKey: relationKey,
      });
      depth = this.runtimeRelationMaxDepth;
    }
    if (page < 1) {
      page = 1;
    }

    return {
      page,
      limit,
      depth,
      sort: obj.sort ?? null,
      filters: obj.filters ?? null,
    };
  }

  /**
   * Creates or updates a scoped view config record by entityKey + scope.
   */
  async upsertScopedConfigView(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    viewType: ConfigObjectViewType;
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
      let nextConfigJson: Record<string, unknown> | null =
        typeof configJson === 'undefined' ? existing.configJson : configJson;
      if (
        nextConfigJson !== null &&
        typeof nextConfigJson === 'object' &&
        !Array.isArray(nextConfigJson)
      ) {
        this.assertNoForbiddenInlineFieldAuthoringKeysInViewConfig(nextConfigJson);
      }
      if (
        viewType === 'list' &&
        nextConfigJson !== null &&
        typeof nextConfigJson === 'object' &&
        !Array.isArray(nextConfigJson)
      ) {
        nextConfigJson = this.normalizeListViewConfigJsonOrThrow(nextConfigJson);
      }
      if (
        (viewType === 'detail' || viewType === 'form') &&
        nextConfigJson !== null &&
        typeof nextConfigJson === 'object' &&
        !Array.isArray(nextConfigJson)
      ) {
        nextConfigJson = this.normalizeDetailFormViewConfigJsonOrThrow(nextConfigJson);
      }
      await this.assertScopedViewConfigFieldKeysExist({
        tenantId: effectiveTenantId,
        entityKey,
        configJson: nextConfigJson,
        bindingMode: configObject.bindingMode,
      });
      if (viewType === 'detail' || viewType === 'form') {
        await this.assertPanelKeysExistForView(
          existing.configObjectViewId,
          this.extractDetailFormPanelKeysFromConfigJson(nextConfigJson),
        );
        if (viewType === 'form') {
          await this.assertFormViewWriteSchemaConstraints({
            tenantId: effectiveTenantId,
            entityKey,
            configObjectViewId: existing.configObjectViewId,
            configJson: nextConfigJson,
          });
        }
      }

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

      await this.warnOrphanPanelsForDetailFormViewIfNeeded(saved);

      return saved;
    }

    let finalConfigJson: Record<string, unknown> | null =
      typeof configJson === 'undefined' ? null : configJson;
    if (
      finalConfigJson !== null &&
      typeof finalConfigJson === 'object' &&
      !Array.isArray(finalConfigJson)
    ) {
      this.assertNoForbiddenInlineFieldAuthoringKeysInViewConfig(finalConfigJson);
    }
    if (
      viewType === 'list' &&
      finalConfigJson !== null &&
      typeof finalConfigJson === 'object' &&
      !Array.isArray(finalConfigJson)
    ) {
      finalConfigJson = this.normalizeListViewConfigJsonOrThrow(finalConfigJson);
    }
    if (
      (viewType === 'detail' || viewType === 'form') &&
      finalConfigJson !== null &&
      typeof finalConfigJson === 'object' &&
      !Array.isArray(finalConfigJson)
    ) {
      finalConfigJson = this.normalizeDetailFormViewConfigJsonOrThrow(finalConfigJson);
    }

    await this.assertScopedViewConfigFieldKeysExist({
      tenantId: effectiveTenantId,
      entityKey,
      configJson: finalConfigJson,
      bindingMode: configObject.bindingMode,
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
      configJson: finalConfigJson,
      createdBy: updatedBy,
      updatedBy,
    });

    const saved = await this.viewRepository.save(created);

    try {
      if (viewType === 'detail' || viewType === 'form') {
        await this.assertPanelKeysExistForView(
          saved.configObjectViewId,
          this.extractDetailFormPanelKeysFromConfigJson(saved.configJson),
        );
        if (viewType === 'form') {
          await this.assertFormViewWriteSchemaConstraints({
            tenantId: effectiveTenantId,
            entityKey,
            configObjectViewId: saved.configObjectViewId,
            configJson: saved.configJson,
          });
        }
      }
    } catch (error) {
      await this.viewRepository.remove(saved);
      throw error;
    }

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

    await this.warnOrphanPanelsForDetailFormViewIfNeeded(saved);

    return saved;
  }

  /**
   * Marks one scoped view as active and deactivates others in the same scope.
   */
  async activateScopedConfigView(params: {
    tenantId: number | null | undefined;
    entityKey: string;
    viewType: ConfigObjectViewType;
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
      throw authoringRpcException(
        AuthoringErrorCode.ScopeTenantMismatch,
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
    viewType: ConfigObjectViewType;
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
        throw authoringRpcException(
          AuthoringErrorCode.ScopeTenantMismatch,
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
    panelType: PanelLayoutDisplayMode;
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

    let finalLayoutConfig: Record<string, unknown> | null =
      typeof layoutConfig === 'undefined' ? null : layoutConfig;
    if (
      finalLayoutConfig !== null &&
      typeof finalLayoutConfig === 'object' &&
      !Array.isArray(finalLayoutConfig)
    ) {
      finalLayoutConfig = this.normalizePanelLayoutConfigOrThrow(finalLayoutConfig);
    }
    this.assertPanelTypeMatchesDisplayMode(panelType, finalLayoutConfig);
    this.assertRelationMembershipPanelLayoutOrThrow(panelType, finalLayoutConfig);

    const panel = this.panelRepository.create({
      configObjectViewId,
      panelKey,
      title,
      panelType,
      layoutConfig: finalLayoutConfig,
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
    panelType?: PanelLayoutDisplayMode;
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
      let nextLayoutConfig: Record<string, unknown> | null = layoutConfig;
      if (
        nextLayoutConfig !== null &&
        typeof nextLayoutConfig === 'object' &&
        !Array.isArray(nextLayoutConfig)
      ) {
        nextLayoutConfig = this.normalizePanelLayoutConfigOrThrow(nextLayoutConfig);
      }
      existing.layoutConfig = nextLayoutConfig;
    }
    if (typeof orderIndex === 'number') {
      existing.orderIndex = orderIndex;
    }

    const effectiveLayout =
      existing.layoutConfig &&
      typeof existing.layoutConfig === 'object' &&
      !Array.isArray(existing.layoutConfig)
        ? (existing.layoutConfig as Record<string, unknown>)
        : null;
    this.assertPanelTypeMatchesDisplayMode(existing.panelType, effectiveLayout);
    this.assertRelationMembershipPanelLayoutOrThrow(
      existing.panelType,
      effectiveLayout,
    );

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
