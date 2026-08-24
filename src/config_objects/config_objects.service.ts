import { Injectable, Logger } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaService } from '../storage/media.service';
import {
  collectMediaPathsFromValue,
  normalizeAttachmentFieldsInPayload,
} from '../storage/media-payload.util';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ConfigTemplateSetEntity } from './entities/config_template_set.entity';
import type { ConfigTemplateSetStatus } from './entities/config_template_set.entity';
import {
  ConfigObjectBindingMode,
  ConfigObjectEntity,
  ConfigObjectStatus,
} from './entities/config_object.entity';
import { ConfigObjectFieldEntity } from './entities/config_object_field.entity';
import { ConfigObjectFieldRuleEntity } from './entities/config_object_field_rule.entity';
import { ConfigObjectRuntimeFieldMetadataEntity } from './entities/config_object_runtime_field_metadata.entity';
import { ConfigAuditLogEntity } from './entities/config_audit_log.entity';
import { ConfigObjectLifecycleTransitionEntity } from './entities/config_object_lifecycle_transition.entity';
import {
  CONFIG_AUDIT_LIST_DEFAULT_LIMIT,
  CONFIG_AUDIT_LIST_MAX_LIMIT,
  type ConfigAuditEntityType,
} from './constants/config-audit.constants';
import type {
  ConfigAuditLogListItem,
  ConfigAuditLogListResult,
} from './interfaces/config-audit-log-list.interface';
import { buildRuntimeV2ListPagination } from '../common/runtime-v2-list-pagination';
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
import { loadCoreEntityFromRegistry } from './core-entity-registry.loader';
import { runnerMetadataForBindingMode } from './config-object-runner';
import {
  ApplySorBoundInstancePatchResult,
  ConfigObjectResolvedInstance,
  ConfigObjectResolvedSorInstance,
  ConfigObjectResolvedStandaloneInstance,
  ConfigObjectRunnerSchemaView,
  ConfigObjectSchemaView,
  ConfigObjectFieldView,
  type SupportedConfigObjectCoreEntity,
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
  CONFIG_OBJECT_RUNTIME_FIELD_METADATA_BINDING_FORBIDDEN_MESSAGE,
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
  FieldRulesValidationError,
  validateFieldRulesJson,
} from './field-rules';
import {
  FieldValidationJsonValidationError,
  isValidMediaFieldValue,
  normalizeMediaRef,
  validateFieldValidationJson,
  type MediaRef,
} from './field-validation';
import {
  mapRelationAuthoringErrorToRpc,
  normalizeQueryConfigInlineRelation,
  normalizeQueryConfigJoinTable,
  validateAndNormalizeRelationManifestsByKey,
} from './relation-authoring';
import type { RelationDescriptor } from './interfaces/relation-descriptor.interface';
import { generateOrmRelationDescriptorsForObjectType } from './relation-catalog/relation-catalog.generator';
import { finalizeCoreFieldDescriptors } from './core-field-descriptor/core-field-descriptor.write-schema';
import { generateBaseCoreFieldDescriptors } from './core-field-descriptor/core-field-descriptor.generator';
import { resolveConfigObjectVerificationFieldMap } from './verification/config-object-verification.util';
import { getSorBoundMetaFieldLookupDescriptor } from './verification/sor-bound-meta-field-lookup.registry';
import type { CoreFieldDescriptor } from './core-field-descriptor/core-field-descriptor.types';
import type { CoreFieldDerivedRuntimeConfig } from './core-field-descriptor/core-field-descriptor.runtime-metadata.types';
import {
  canonicalizeObjectType,
  resolveEntityClassForObjectType,
  resolveObjectTypeForEntityClass,
} from './core-field-descriptor/object-type-entity.registry';
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
import {
  inferDefaultBindingModeForObjectType,
  isSystemTableObjectType,
} from './object-catalog-scope';
import type {
  ConfigObjectRuntimeManifestView,
  RuntimeComposedSubmitPayloadView,
  RuntimeManifestDiagnostic,
  RuntimeCacheInvalidationResult,
  RuntimeRelationActionValidationResult,
  RuntimeManifestViewSection,
} from './interfaces/runtime-manifest.interface';
import { deniedCoreFieldKeysForObjectListCatalog } from './list-field-catalog/list-field-catalog-core-deny.registry';
import {
  assertPersistableConfigObjectFieldKey,
  normalizeConfigObjectFieldKey,
} from './utils/normalize-config-object-field-key';
import { resolveFilterOperatorsForListFieldType } from './list-field-catalog/list-field-catalog.operator-map';
import type {
  ObjectListFieldCatalogEntry,
  ObjectListFieldCatalogView,
} from './list-field-catalog/object-list-field-catalog.interface';
import { EventsService } from '../events/events.service';

/** Config object statuses that Object Designer may author against. */
const AUTHORABLE_CONFIG_OBJECT_STATUSES: ConfigObjectStatus[] = [
  'DRAFT',
  'PUBLISHED',
];

/** Template set statuses eligible for authoring lookups. */
const AUTHORABLE_TEMPLATE_SET_STATUSES: ConfigTemplateSetStatus[] = [
  'DRAFT',
  'PUBLISHED',
];
import {
  configScopeTenantId,
  resolveStoredTenantId,
} from '../common/utils/tenant-scope.util';
import { ProcessStepLocksService } from '../process_instances/process_step_locks/process-step-locks.service';
import { PLATFORM_EVENT_NAMES } from '../events/constants/platform-event-names.constants';
import {
  buildSorBoundInstanceUpdatedEventOptions,
  buildStandaloneConfigObjectInstanceCreatedOptions,
  buildStandaloneConfigObjectInstanceDeletedOptions,
  buildStandaloneConfigObjectInstanceUpdatedOptions,
  resolveTenantIdFromSorCore,
} from '../events/platform-config-object-event.util';
import { provisionSorBoundCoreRecordFromSave } from '../automation/sor-bound-core-record.provisioner';
import { PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE } from '../automation/process-step-object-binding.constants';
import {
  manyToManyJoinConfigToQueryConfig,
  resolveManyToManyJoinConfig,
} from './list-query/resolve-many-to-many-join-config';
import {
  loadManyToOneSnapshotsForPrimary,
  loadOneToManySnapshotsForRelations,
  serializeEntityRow,
} from './composite-snapshot/composite-snapshot.loader';
import type { ConfigObjectCompositeSnapshotView } from './interfaces/config-object-composite-snapshot.interface';
import { getSorMetaTableDescriptor } from './sor-meta-table';
import {
  assertReferenceListDataRefKnown,
  buildReferenceListCatalog,
  buildSchemaLookupCatalog,
  resolveReferenceListCatalogLookup,
  isReferenceListStrictValidationEnabled,
  ReferenceListValidationError,
} from './reference-list';
import type {
  ReferenceListCatalogLookupView,
  ReferenceListCatalogView,
} from './reference-list/reference-list.types';

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

  private formatConfigObjectScopeCacheSegment(scope?: {
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): string {
    if (!scope) {
      return 'default';
    }
    if (typeof scope.configObjectId === 'number') {
      return `oid:${Math.trunc(scope.configObjectId)}`;
    }
    if (typeof scope.configTemplateSetId === 'number') {
      return `tsid:${Math.trunc(scope.configTemplateSetId)}`;
    }
    const key = scope.templateSetKey?.trim();
    if (key) {
      return `tskey:${key}`;
    }
    return 'default';
  }

  private getSchemaCacheKey(
    tenantId: number | null,
    objectType: string,
    scope?: {
      configObjectId?: number;
      configTemplateSetId?: number;
      templateSetKey?: string;
    },
  ): string {
    return `${tenantId ?? 'global'}::${objectType}::${this.formatConfigObjectScopeCacheSegment(scope)}`;
  }

  private getActiveViewCacheKey(params: {
    tenantId: number | null;
    entityKey: string;
    viewType: ConfigObjectViewType;
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): string {
    return `${params.tenantId ?? 'global'}::${params.entityKey}::${params.viewType}::${this.formatConfigObjectScopeCacheSegment(params)}`;
  }

  private getRuntimeManifestCacheKey(params: {
    tenantId: number | null;
    entityKey: string;
    includeDiagnostics: boolean;
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): string {
    return `${params.tenantId ?? 'global'}::${params.entityKey}::${params.includeDiagnostics ? 'diag' : 'no_diag'}::${this.formatConfigObjectScopeCacheSegment(params)}`;
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
    @InjectRepository(ConfigObjectRuntimeFieldMetadataEntity)
    private readonly runtimeFieldMetadataRepository: Repository<ConfigObjectRuntimeFieldMetadataEntity>,
    @InjectRepository(ConfigObjectLifecycleEntity)
    private readonly lifecycleRepository: Repository<ConfigObjectLifecycleEntity>,
    @InjectRepository(ConfigObjectLifecycleTransitionEntity)
    private readonly lifecycleTransitionRepository: Repository<ConfigObjectLifecycleTransitionEntity>,
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
    private readonly eventsService: EventsService,
    private readonly stepLocks: ProcessStepLocksService,
    private readonly configService: ConfigService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Normalizes nullable tenant identifiers to an effective value.
   *
   * We use `null` to represent system/global scope, and positive integers for
   * tenant-scoped configuration.
   */
  private getEffectiveTenantId(
    tenantId: number | string | null | undefined,
  ): number | null {
    if (typeof tenantId === 'number' && tenantId > 0) {
      return tenantId;
    }
    if (typeof tenantId === 'string') {
      const parsed = Number(tenantId);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.trunc(parsed);
      }
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
  private buildCandidateObjectTypes(
    objectType: string,
    canonicalObjectType: string,
  ): string[] {
    const sorEntityClass = resolveEntityClassForObjectType(canonicalObjectType);
    const sorTableObjectType = sorEntityClass
      ? resolveObjectTypeForEntityClass(sorEntityClass)
      : null;
    return Array.from(
      new Set(
        [
          canonicalObjectType,
          objectType?.trim().toLowerCase(),
          sorTableObjectType?.trim().toLowerCase(),
        ].filter((value): value is string => Boolean(value)),
      ),
    );
  }

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
      throw new RpcException(
        CONFIG_OBJECT_SYSTEM_TABLE_FIELDS_FORBIDDEN_MESSAGE,
      );
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

  private normalizeDerivedInputValue(
    value: unknown,
    trim: boolean,
  ): string | null {
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
      target[descriptor.fieldKey] = this.evaluateDerivedRuntimeValue(
        cfg,
        target,
      );
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
      const nextIsArray =
        Number.isInteger(Number(nextSeg)) &&
        String(Number(nextSeg)) === nextSeg;
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
    const lastIsArrayIndex =
      Number.isInteger(lastIdx) && String(lastIdx) === last;
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
    return (
      (inlineRelation as Record<string, unknown>).mode === 'inline_required'
    );
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

  /**
   * Validate/normalize attachment fields on standalone instance payloads using schema registry.
   */
  private async normalizeStandaloneInstanceAttachmentPayload(params: {
    tenantId: number | null;
    objectType: string;
    payload: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const schema = await this.getObjectSchema(
      params.tenantId,
      params.objectType,
    );
    if (!schema?.fieldRegistry?.length) {
      return params.payload;
    }

    const result = normalizeAttachmentFieldsInPayload(
      params.payload,
      schema.fieldRegistry,
      normalizeAttachmentFieldValue,
    );
    if (!result.ok) {
      throw new RpcException({
        code: RuntimeErrorCode.SubmitFieldInvalid,
        message: `Invalid attachment value for field "${result.fieldKey}": ${result.message}`,
      });
    }
    return result.payload;
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
      if (
        typeof directFieldKey === 'string' &&
        directFieldKey.trim().length > 0
      ) {
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
  private isRelationMembershipPanel(
    panel: ConfigObjectViewPanelEntity,
  ): boolean {
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

    const selectionControl = (layout as Record<string, unknown>)
      .selectionControl;
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
      for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
      )) {
        if (
          ['field', 'fieldKey', 'timeField', 'groupBy'].includes(key) &&
          typeof value === 'string' &&
          value.trim().length > 0
        ) {
          out.add(value.trim());
        } else if (
          [
            'columns',
            'cardFields',
            'keyValueFields',
            'fieldOrder',
            'eventFields',
          ].includes(key) &&
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
    const panelKeys = this.extractDetailFormPanelKeysFromConfigJson(
      params.configJson,
    );
    if (!panelKeys.length) {
      return;
    }
    const schema = await this.getObjectSchema(
      params.tenantId,
      params.entityKey,
    );
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
          (field.requiredOnCreate === true ||
            field.requiredOnUpdate === true) &&
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
        const relationKey = (panel.layoutConfig as Record<string, unknown>)
          .relationKey;
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
        .filter(
          (p): p is string => typeof p === 'string' && p.trim().length > 0,
        )
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
   * Loads a config object and ensures it is standalone and visible in tenant scope.
   * Global published packs (e.g. HVAC demo, platform tenant settings) are readable
   * by tenant users; tenant-owned packs remain scoped to their owner.
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
      where: { configTemplateSetId: existing.configTemplateSetId },
    });

    if (
      !templateSet ||
      !this.isTemplateSetAccessibleForScope(templateSet, effectiveTenantId)
    ) {
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
      verificationFieldMap: resolveConfigObjectVerificationFieldMap(
        schema.configObject,
      ),
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

      const targetFieldViews = await this.loadFieldViewsForSchemaBinding(
        targetConfigObject,
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
    } = await this.buildRelatedFieldRegistryByRelationKey(
      relations,
      templateSetId,
    );
    const relationManifestsByKey: Record<string, Record<string, unknown> | null> =
      {};
    for (const rel of relations) {
      const manifest = rel.relationManifestJson;
      if (
        manifest != null &&
        typeof manifest === 'object' &&
        !Array.isArray(manifest)
      ) {
        relationManifestsByKey[rel.relationshipKey] =
          manifest as Record<string, unknown>;
      }
    }

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
   * `sor_bound` types with JSON meta tables use {@link loadSorBoundMetaJson}.
   *
   * Gateway should enforce domain permissions (e.g. `projects.update`) before calling.
   *
   * When `tenantId` is omitted, resolves the global published schema (super-admin
   * scope). Meta patches are always allowed; core patches on tenant-scoped SoR rows
   * (`project`, `task`, `resource`) require `tenantId >= 1`.
   */
  async applySorBoundInstancePatch(params: {
    tenantId?: number | null;
    objectType: string;
    coreId?: number;
    stepObjectInstanceId?: number;
    corePatch?: Record<string, unknown>;
    metaPatch?: Record<string, unknown>;
    customerId?: number;
  }): Promise<ApplySorBoundInstancePatchResult> {
    if (params.stepObjectInstanceId != null && params.coreId == null) {
      const { stepObjectInstanceId, ...deferredParams } = params;
      return this.applyDeferredSorBoundStepBindingSave({
        ...deferredParams,
        stepObjectInstanceId,
      });
    }

    if (params.coreId == null) {
      throw new RpcException(
        'Provide coreId for an existing SoR row or stepObjectInstanceId for deferred first save.',
      );
    }

    const {
      tenantId,
      objectType,
      coreId,
      corePatch = {},
      metaPatch = {},
      customerId,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const schema = await this.getObjectSchema(effectiveTenantId, objectType);
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
    const allowedMetaKeys = new Set(schema.fields.map((f) => f.field.fieldKey));

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

    if (
      !Object.keys(filteredCore).length &&
      !Object.keys(filteredMeta).length
    ) {
      throw new RpcException(
        'No patch entries matched allowed SoR or custom field keys.',
      );
    }

    if (
      Object.keys(filteredCore).length &&
      effectiveTenantId === null &&
      !this.isGlobalScopeSorCorePatchType(objectType)
    ) {
      throw new RpcException(
        'Core field updates require tenant scope. Omit corePatch or provide tenantId >= 1.',
      );
    }

    return this.dataSource.transaction(async (manager) =>
      this.applySorBoundPatchInTransaction(
        manager,
        objectType,
        coreId,
        effectiveTenantId,
        filteredCore,
        filteredMeta,
        customerId,
      ),
    ).then((result) => {
      const changedFields = [
        ...Object.keys(filteredCore),
        ...Object.keys(filteredMeta),
      ];
      const resolvedTenantId =
        effectiveTenantId ??
        resolveTenantIdFromSorCore(
          result.core as unknown as Record<string, unknown>,
        );
      const eventTenantId =
        resolvedTenantId ??
        (this.isGlobalScopeSorCorePatchType(objectType) ? 0 : undefined);

      if (eventTenantId !== undefined) {
        this.eventsService.emit(
          PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
          buildSorBoundInstanceUpdatedEventOptions({
            objectType,
            coreId,
            tenantId: eventTenantId,
            changedFields,
          }),
        );
      } else {
        this.logger.warn(
          `Skipping ${PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED} — no tenant scope for ${objectType}:${coreId}`,
        );
      }

      return result;
    });
  }

  /**
   * First save for a deferred `create_on_enter` sor_bound process step binding:
   * creates the SoR row from submitted patches, links `core_id`, and emits update event.
   */
  private async applyDeferredSorBoundStepBindingSave(params: {
    tenantId?: number | null;
    objectType: string;
    stepObjectInstanceId: number;
    corePatch?: Record<string, unknown>;
    metaPatch?: Record<string, unknown>;
  }): Promise<ApplySorBoundInstancePatchResult> {
    const {
      tenantId,
      objectType,
      stepObjectInstanceId,
      corePatch = {},
      metaPatch = {},
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const schema = await this.getObjectSchema(effectiveTenantId, objectType);
    if (!schema) {
      throw new RpcException('Configuration schema not found for object type.');
    }
    if (schema.configObject.bindingMode !== 'sor_bound') {
      throw new RpcException(
        'Deferred step binding save is only valid for sor_bound objects.',
      );
    }

    const writableSor = getWritableSorFieldKeys(objectType);
    const allowedMetaKeys = new Set(schema.fields.map((f) => f.field.fieldKey));

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

    if (
      !Object.keys(filteredCore).length &&
      !Object.keys(filteredMeta).length &&
      !Object.keys(corePatch).length &&
      !Object.keys(metaPatch).length
    ) {
      throw new RpcException(
        'No patch entries matched allowed SoR or custom field keys.',
      );
    }

    const [bindingPreview] = await this.dataSource.query(
      `SELECT oi.step_object_instance_id,
              co.object_type,
              co.binding_mode AS config_binding_mode,
              b.binding_mode,
              oi.core_id,
              oi.status
         FROM process_instance_step_object_instances oi
         JOIN config_objects co ON co.config_object_id = oi.config_object_id
         LEFT JOIN process_template_step_object_bindings b
           ON b.binding_id = oi.binding_id
        WHERE oi.step_object_instance_id = ?
        LIMIT 1`,
      [stepObjectInstanceId],
    );

    if (!bindingPreview) {
      throw new RpcException('Process step object binding not found.');
    }

    this.assertDeferredSorBoundBindingEligible(bindingPreview, objectType);

    let newCoreId = 0;
    const result = await this.dataSource.transaction(async (manager) => {
      const [binding] = await manager.query(
        `SELECT oi.step_object_instance_id,
                oi.core_id,
                oi.status,
                b.binding_mode,
                co.object_type,
                co.binding_mode AS config_binding_mode,
                pi.tenant_id,
                pi.process_instance_id,
                pi.context
           FROM process_instance_step_object_instances oi
           JOIN process_instance_steps s ON s.step_instance_id = oi.step_instance_id
           JOIN process_instances pi ON pi.process_instance_id = s.process_instance_id
           JOIN config_objects co ON co.config_object_id = oi.config_object_id
           LEFT JOIN process_template_step_object_bindings b
             ON b.binding_id = oi.binding_id
          WHERE oi.step_object_instance_id = ?
          LIMIT 1
          FOR UPDATE`,
        [stepObjectInstanceId],
      );

      if (!binding) {
        throw new RpcException('Process step object binding not found.');
      }

      this.assertDeferredSorBoundBindingEligible(binding, objectType);

      const processContext = this.parseJsonRecord(binding.context);
      newCoreId = await provisionSorBoundCoreRecordFromSave(manager, {
        tenantId: Number(binding.tenant_id ?? 0),
        objectType,
        processInstanceId: Number(binding.process_instance_id),
        stepObjectInstanceId,
        context: processContext,
        corePatch: this.mergeDeferredCreateCorePatch(
          objectType,
          filteredCore,
          corePatch,
        ),
        metaPatch: filteredMeta,
      });

      await manager.query(
        `UPDATE process_instance_step_object_instances
            SET core_id = ?,
                status = ?,
                last_error = NULL,
                updated_at = NOW()
          WHERE step_object_instance_id = ?`,
        [
          newCoreId,
          PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE,
          stepObjectInstanceId,
        ],
      );

      return this.applySorBoundPatchInTransaction(
        manager,
        objectType,
        newCoreId,
        effectiveTenantId,
        {},
        {},
      );
    });

    const eventTenantId =
      effectiveTenantId ??
      resolveTenantIdFromSorCore(
        result.core as unknown as Record<string, unknown>,
      ) ??
      (this.isGlobalScopeSorCorePatchType(objectType) ? 0 : undefined);

    if (eventTenantId !== undefined && newCoreId > 0) {
      this.eventsService.emit(
        PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
        buildSorBoundInstanceUpdatedEventOptions({
          objectType,
          coreId: newCoreId,
          tenantId: eventTenantId,
          changedFields: [
            ...Object.keys(filteredCore),
            ...Object.keys(filteredMeta),
          ],
        }),
      );
    }

    return { ...result, coreId: newCoreId };
  }

  /**
   * On deferred customer create, allow bootstrap core fields (email/password) that are
   * read-only or absent from the writable SoR patch allowlist.
   */
  private mergeDeferredCreateCorePatch(
    objectType: string,
    filteredCore: Record<string, unknown>,
    rawCorePatch: Record<string, unknown>,
  ): Record<string, unknown> {
    if (objectType !== 'customer') {
      return filteredCore;
    }

    const bootstrap: Record<string, unknown> = { ...filteredCore };
    for (const key of ['email', 'password'] as const) {
      if (rawCorePatch[key] !== undefined && rawCorePatch[key] !== null) {
        bootstrap[key] = rawCorePatch[key];
      }
    }
    return bootstrap;
  }

  private assertDeferredSorBoundBindingEligible(
    binding: Record<string, unknown>,
    objectType: string,
  ): void {
    if (String(binding.object_type) !== objectType) {
      throw new RpcException('objectType does not match the step object binding.');
    }

    if (binding.config_binding_mode !== 'sor_bound') {
      throw new RpcException(
        'Deferred save is only supported for sor_bound bindings.',
      );
    }

    const templateBindingMode = String(binding.binding_mode ?? 'create_on_enter');
    if (templateBindingMode !== 'create_on_enter') {
      throw new RpcException(
        'Deferred save requires template binding_mode create_on_enter.',
      );
    }

    if (binding.core_id != null) {
      throw new RpcException(
        'Binding already has a coreId; use coreId patch instead of stepObjectInstanceId.',
      );
    }

    if (!['pending', 'failed', 'active'].includes(String(binding.status))) {
      throw new RpcException(
        `Binding status "${binding.status}" does not allow deferred save.`,
      );
    }
  }

  private parseJsonRecord(value: unknown): Record<string, unknown> | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  private async applySorBoundPatchInTransaction(
    manager: EntityManager,
    objectType: string,
    coreId: number,
    tenantScope: number | null,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
    customerId?: number,
  ): Promise<ApplySorBoundInstancePatchResult> {
    if (objectType === 'project') {
      return this.patchProjectCoreAndMeta(
        manager,
        coreId,
        tenantScope,
        filteredCore,
        filteredMeta,
      );
    }
    if (objectType === 'task') {
      return this.patchTaskCoreAndMeta(
        manager,
        coreId,
        tenantScope,
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
        tenantScope,
        filteredCore,
        filteredMeta,
      );
    }

    throw new RpcException(
      `apply_sor_bound_instance_patch is not implemented for object_type: ${objectType}.`,
    );
  }

  private isGlobalScopeSorCorePatchType(objectType: string): boolean {
    return objectType === 'customer';
  }

  private assignFilteredCoreProps(
    entity: Record<string, unknown>,
    filteredCore: Record<string, unknown>,
    objectType: string,
  ): void {
    for (const [key, value] of Object.entries(filteredCore)) {
      if (objectType === 'resource' && key === 'isShared') {
        entity[key] =
          value === true || value === 1 || value === '1' || value === 'true'
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
    tenantScope: number | null,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const project = await manager.findOne(ProjectEntity, {
      where: { projectId: coreId },
    });
    if (!project) {
      throw new RpcException('Project not found.');
    }
    if (
      Object.keys(filteredCore).length &&
      tenantScope !== null &&
      project.tenantId !== tenantScope
    ) {
      throw new RpcException(
        'Project does not belong to the specified tenant.',
      );
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
    tenantScope: number | null,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const task = await manager.findOne(TaskEntity, {
      where: { taskId: coreId },
    });
    if (!task) {
      throw new RpcException('Task not found.');
    }
    if (
      Object.keys(filteredCore).length &&
      tenantScope !== null &&
      task.tenantId !== tenantScope
    ) {
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
    tenantScope: number | null,
    filteredCore: Record<string, unknown>,
    filteredMeta: Record<string, unknown>,
  ): Promise<ApplySorBoundInstancePatchResult> {
    const resource = await manager.findOne(ResourceEntity, {
      where: { resourceId: coreId },
    });
    if (!resource) {
      throw new RpcException('Resource not found.');
    }
    if (
      Object.keys(filteredCore).length &&
      tenantScope !== null &&
      resource.tenantId !== tenantScope
    ) {
      throw new RpcException(
        'Resource does not belong to the specified tenant.',
      );
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
    scope?: {
      configObjectId?: number;
      configTemplateSetId?: number;
      templateSetKey?: string;
    },
  ): Promise<ConfigObjectRunnerSchemaView | null> {
    const canonicalObjectType =
      this.normalizeCanonicalObjectTypeOrThrow(objectType);
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    this.clearExpiredRuntimeCaches();
    const cacheKey = this.getSchemaCacheKey(
      effectiveTenantId,
      canonicalObjectType,
      scope,
    );
    const cached = this.schemaCache.get(cacheKey);
    if (cached && this.isFresh(cached.expiresAt)) {
      return cached.value;
    }

    const configObject = await this.tryResolveConfigObjectForEntityScope({
      entityKey: objectType,
      effectiveTenantId,
      configObjectId: scope?.configObjectId,
      configTemplateSetId: scope?.configTemplateSetId,
      templateSetKey: scope?.templateSetKey,
    });

    if (!configObject) {
      this.schemaCache.set(cacheKey, {
        expiresAt: Date.now() + this.runtimeCacheTtlMs,
        value: null,
      });
      return null;
    }

    const fieldViews = await this.loadFieldViewsForSchemaBinding(configObject);

    const base = this.enrichSchemaViewWithRunner({
      configObject,
      fields: fieldViews,
    });
    const schema = await this.attachRelationCatalog(
      base,
      configObject.configTemplateSetId,
    );
    const withLookupCatalog = this.attachLookupCatalogToSchema(schema);
    this.schemaCache.set(cacheKey, {
      expiresAt: Date.now() + this.runtimeCacheTtlMs,
      value: withLookupCatalog,
    });
    return withLookupCatalog;
  }

  /**
   * Canonical lookup `dataRef` catalog for gateway, mobile, and Designer clients.
   *
   * When `dataRef` or `entityKey` is provided, returns a resolved lookup slice
   * (`entityKey` + `entry`) for Object Runner lookup-options hydration.
   */
  getReferenceListCatalog(params?: {
    dataRef?: string;
    entityKey?: string;
  }): ReferenceListCatalogView | ReferenceListCatalogLookupView | null {
    const dataRef =
      typeof params?.dataRef === 'string' ? params.dataRef.trim() : '';
    const entityKey =
      typeof params?.entityKey === 'string' ? params.entityKey.trim() : '';

    if (dataRef.length > 0 || entityKey.length > 0) {
      return resolveReferenceListCatalogLookup({ dataRef, entityKey });
    }

    return buildReferenceListCatalog();
  }

  private attachLookupCatalogToSchema(
    schema: ConfigObjectRunnerSchemaView,
  ): ConfigObjectRunnerSchemaView {
    const dataRefs: string[] = [];
    for (const field of schema.fieldRegistry) {
      const dataRef = field.lookupSelectConfig?.dataRef;
      if (typeof dataRef === 'string' && dataRef.trim()) {
        dataRefs.push(dataRef);
      }
    }

    const lookupCatalog = buildSchemaLookupCatalog({ dataRefs });
    if (lookupCatalog.length === 0) {
      return schema;
    }

    return {
      ...schema,
      lookupCatalog,
    };
  }

  private assertReferenceListDataRefOnSave(dataRef: string): void {
    const strict = isReferenceListStrictValidationEnabled(this.configService);
    try {
      const unknown = assertReferenceListDataRefKnown(dataRef, { strict });
      if (!unknown && !strict) {
        this.logger.warn(
          `Unknown lookup dataRef "${dataRef.trim()}" saved in non-strict mode.`,
        );
      }
    } catch (error) {
      if (error instanceof ReferenceListValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.LookupSelectInvalid,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Published-schema list filter/sort catalog for Object Designer and domain APIs.
   * Omits sensitive core columns per deny registry; meta keys come from configured fields.
   *
   * @param params.tenantId - Tenant scope (omit for global resolved template-set).
   * @param params.objectType - Logical object type (canonicalized internally).
   */
  async getObjectListFieldCatalog(params: {
    tenantId: number | null | undefined;
    objectType: string;
  }): Promise<ObjectListFieldCatalogView> {
    const canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(
      params.objectType,
    );
    const effectiveTenantId = this.getEffectiveTenantId(params.tenantId);
    const deniedCore =
      deniedCoreFieldKeysForObjectListCatalog(canonicalObjectType);

    const schema = await this.getObjectSchema(
      effectiveTenantId,
      canonicalObjectType,
    );

    const entityClass = resolveEntityClassForObjectType(canonicalObjectType);
    const coreKeySet = new Set<string>();
    const metaKeySet = new Set<string>();

    if (schema) {
      for (const d of schema.fieldRegistry ?? []) {
        if (
          this.canResolveListCatalogCoreColumn(d.fieldKey, entityClass) &&
          !deniedCore.has(d.fieldKey)
        ) {
          coreKeySet.add(d.fieldKey);
        }
      }
      for (const fv of schema.fields ?? []) {
        const key = fv?.field?.fieldKey;
        if (typeof key === 'string' && /^[A-Za-z0-9_]+$/.test(key)) {
          metaKeySet.add(key);
        }
      }
    }

    const registryByKey = new Map(
      (schema?.fieldRegistry ?? []).map((d) => [d.fieldKey, d]),
    );

    const fields: ObjectListFieldCatalogEntry[] = [];

    for (const key of Array.from(coreKeySet).sort()) {
      const descriptor = registryByKey.get(key);
      const fieldType = descriptor?.fieldType ?? 'text';
      const label = descriptor?.label ?? key;
      fields.push({
        fieldKey: key,
        source: 'core',
        label,
        fieldType,
        filterable: true,
        sortable: true,
        filterOperators: resolveFilterOperatorsForListFieldType(fieldType),
      });
    }

    const seenKeys = new Set(fields.map((f) => f.fieldKey));

    for (const key of Array.from(metaKeySet).sort()) {
      if (seenKeys.has(key)) {
        continue;
      }
      const fieldView = schema?.fields?.find((f) => f.field.fieldKey === key);
      const fieldType = fieldView?.field.fieldType ?? 'text';
      const label = fieldView?.field.label ?? key;
      fields.push({
        fieldKey: key,
        source: 'meta',
        label,
        fieldType,
        filterable: true,
        sortable: true,
        filterOperators: resolveFilterOperatorsForListFieldType(fieldType),
      });
    }

    /** Related core columns (`relatedFieldRegistryByRelationKey`), including M2M membership targets. */
    const relatedCompoundSeen = new Set<string>();
    for (const rel of schema?.relations ?? []) {
      const descriptors =
        schema?.relatedFieldRegistryByRelationKey?.[rel.relationshipKey] ?? [];
      const toCanon = canonicalizeObjectType(rel.toObjectType);
      const relatedEntityClass = resolveEntityClassForObjectType(
        rel.toObjectType,
      );

      if (!relatedEntityClass || !descriptors.length) {
        continue;
      }

      const deniedRelated = deniedCoreFieldKeysForObjectListCatalog(toCanon);

      for (const d of descriptors) {
        const compoundKey = `${rel.relationshipKey}::${d.fieldKey}`;
        if (relatedCompoundSeen.has(compoundKey)) {
          continue;
        }

        if (
          deniedRelated.has(d.fieldKey) ||
          !this.canResolveListCatalogCoreColumn(d.fieldKey, relatedEntityClass)
        ) {
          continue;
        }

        relatedCompoundSeen.add(compoundKey);
        fields.push({
          fieldKey: d.fieldKey,
          source: 'related',
          relationshipKey: rel.relationshipKey,
          label: d.label,
          fieldType: d.fieldType,
          filterable: true,
          sortable: false,
          filterOperators: resolveFilterOperatorsForListFieldType(d.fieldType),
        });
      }
    }

    return {
      objectType: canonicalObjectType,
      tenantId: effectiveTenantId,
      schemaFound: Boolean(schema),
      fields,
      catalogVersion: 2,
    };
  }

  private canResolveListCatalogCoreColumn(
    fieldKey: string,
    entityClass: Function | null | undefined,
  ): boolean {
    if (typeof fieldKey !== 'string' || !/^[A-Za-z0-9_]+$/.test(fieldKey)) {
      return false;
    }
    if (!entityClass) {
      return false;
    }
    try {
      return Boolean(
        this.dataSource
          .getMetadata(entityClass)
          .findColumnWithPropertyName(fieldKey),
      );
    } catch {
      return false;
    }
  }

  /**
   * Resolves a standalone instance from `config_custom_object_instances`.
   */
  private async resolveStandaloneObjectInstance(
    storedTenantId: number,
    objectType: string,
    instanceId: number,
  ): Promise<ConfigObjectResolvedStandaloneInstance | null> {
    const schema = await this.getObjectSchema(
      configScopeTenantId(storedTenantId),
      objectType,
    );

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
        tenantId: storedTenantId,
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
      tenantId: storedTenantId,
      schema,
      dynamicFields,
      sections: [],
    };
  }

  /**
   * Loads a core row for any registered object type (`system_table` or `sor_bound`).
   * Uses the entity catalog — no per-type switch cases.
   */
  async loadCoreRecord(
    objectType: string,
    coreId: number,
  ): Promise<Record<string, unknown> | null> {
    const coreEntity = await loadCoreEntityFromRegistry(
      this.dataSource,
      objectType,
      coreId,
    );
    if (!coreEntity) {
      return null;
    }
    return coreEntity as Record<string, unknown>;
  }

  /**
   * Returns raw payload + status for a standalone custom object instance.
   */
  async getCustomObjectInstanceSnapshot(
    tenantId: number,
    instanceId: number,
  ): Promise<{ payload: Record<string, unknown>; status: string } | null> {
    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId: instanceId,
        tenantId,
      },
    });
    if (!row) {
      return null;
    }
    return {
      payload: row.payload ?? {},
      status: row.status,
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
    tenantId: number | null | undefined,
    objectType: string,
    coreId?: number,
    instanceId?: number,
  ): Promise<ConfigObjectResolvedInstance | null> {
    const hasCore = typeof coreId === 'number' && coreId >= 1;
    const hasInst = typeof instanceId === 'number' && instanceId >= 1;

    if (hasInst) {
      const storedTenantId = resolveStoredTenantId(tenantId);
      return this.resolveStandaloneObjectInstance(
        storedTenantId,
        objectType,
        instanceId as number,
      );
    }

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    if (!hasCore) {
      throw new RpcException(
        'Provide coreId for SoR-backed objects or instanceId for standalone objects.',
      );
    }

    const schema = await this.getObjectSchema(effectiveTenantId, objectType);

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
      tenantId: effectiveTenantId ?? 0,
      schema,
      core: coreEntity,
      dynamicFields,
      sections: [],
    };

    return resolved;
  }

  /**
   * Composite read for admin records: primary row + related FK/child snapshots.
   * Works for `system_table`, `sor_bound`, and other registry-backed types.
   */
  async resolveCompositeSnapshot(params: {
    tenantId: number | null | undefined;
    objectType: string;
    id: number;
  }): Promise<ConfigObjectCompositeSnapshotView | null> {
    const canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(
      params.objectType,
    );
    const effectiveTenantId = this.getEffectiveTenantId(params.tenantId);
    const schema = await this.getObjectSchema(
      effectiveTenantId,
      canonicalObjectType,
    );
    if (!schema) {
      return null;
    }

    const entityClass = resolveEntityClassForObjectType(canonicalObjectType);
    if (!entityClass) {
      return null;
    }

    const primaryRow = await loadCoreEntityFromRegistry(
      this.dataSource,
      canonicalObjectType,
      params.id,
    );
    if (!primaryRow) {
      return null;
    }

    if (
      effectiveTenantId !== null &&
      typeof (primaryRow as Record<string, unknown>).tenantId === 'number' &&
      (primaryRow as Record<string, unknown>).tenantId !== effectiveTenantId
    ) {
      throw new RpcException(
        `Requested ${canonicalObjectType} record does not belong to the specified tenant.`,
      );
    }

    const relations = await this.getMergedRelationshipCatalogForObjectType(
      canonicalObjectType,
    );

    const relatedSnapshots: Record<string, unknown> = {
      ...(await loadManyToOneSnapshotsForPrimary(
        this.dataSource,
        entityClass,
        primaryRow,
      )),
      ...(await loadOneToManySnapshotsForRelations(this.dataSource, {
        primaryEntityClass: entityClass,
        primaryRow,
        relations,
      })),
    };

    let dynamicFields: Record<string, unknown> | undefined;
    if (schema.configObject.bindingMode === 'sor_bound') {
      const metaJson = await this.loadSorBoundMetaJson(
        canonicalObjectType,
        params.id,
      );
      dynamicFields = this.mergeDynamicFieldsFromSource(
        schema,
        metaJson ?? undefined,
      );
    }

    return {
      objectType: canonicalObjectType,
      id: params.id,
      tenantId: effectiveTenantId,
      bindingMode: schema.configObject.bindingMode,
      schema,
      primary: serializeEntityRow(primaryRow),
      dynamicFields,
      relatedSnapshots,
    };
  }

  /**
   * Finds a sor_bound instance by an exact meta JSON field value (e.g. verification token).
   */
  async findSorBoundInstanceByMetaField(params: {
    tenantId?: number | null;
    objectType: string;
    fieldKey: string;
    fieldValue: string;
  }): Promise<{ coreId: number; metaJson: Record<string, unknown> } | null> {
    const objectType = params.objectType.trim();
    const fieldKey = params.fieldKey.trim();
    const fieldValue = params.fieldValue.trim();

    if (!fieldKey || !fieldValue) {
      throw new RpcException(
        'fieldKey and fieldValue are required for meta lookup.',
      );
    }

    const descriptor = getSorBoundMetaFieldLookupDescriptor(objectType);
    if (!descriptor) {
      throw new RpcException(
        `Meta field lookup is not supported for object_type: ${objectType}`,
      );
    }

    const metaMetadata = this.dataSource.getMetadata(descriptor.metaEntity);
    const metaAlias = 'meta';
    const metaJsonColumn =
      metaMetadata.findColumnWithPropertyName(descriptor.metaJsonProperty)
        ?.databaseName ?? 'meta_json';
    const coreIdColumn =
      metaMetadata.findColumnWithPropertyName(descriptor.coreIdProperty)
        ?.databaseName ?? 'core_id';

    const qb = this.dataSource
      .getRepository(descriptor.metaEntity)
      .createQueryBuilder(metaAlias)
      .where(
        `JSON_UNQUOTE(JSON_EXTRACT(${metaAlias}.${metaJsonColumn}, :jsonPath)) = :fieldValue`,
        { jsonPath: `$.${fieldKey}`, fieldValue },
      )
      .take(2);

    if (
      descriptor.coreEntity &&
      descriptor.tenantIdProperty &&
      descriptor.corePkProperty &&
      typeof params.tenantId === 'number' &&
      params.tenantId > 0
    ) {
      const coreMetadata = this.dataSource.getMetadata(descriptor.coreEntity);
      const coreAlias = 'core';
      const corePkColumn =
        coreMetadata.findColumnWithPropertyName(descriptor.corePkProperty)
          ?.databaseName ?? descriptor.corePkProperty;
      const tenantColumn =
        coreMetadata.findColumnWithPropertyName(descriptor.tenantIdProperty)
          ?.databaseName ?? 'tenant_id';

      qb.innerJoin(
        descriptor.coreEntity,
        coreAlias,
        `${coreAlias}.${corePkColumn} = ${metaAlias}.${coreIdColumn}`,
      ).andWhere(`${coreAlias}.${tenantColumn} = :tenantId`, {
        tenantId: params.tenantId,
      });
    }

    const rows = await qb.getMany();
    if (rows.length === 0) {
      return null;
    }
    if (rows.length > 1) {
      throw new RpcException(
        'Ambiguous meta field lookup matched multiple records.',
      );
    }

    const row = rows[0] as Record<string, unknown>;
    const coreId = Number(row[descriptor.coreIdProperty]);
    const metaJson = row[descriptor.metaJsonProperty];
    if (!Number.isFinite(coreId) || coreId < 1) {
      throw new RpcException('Meta lookup resolved an invalid core id.');
    }

    return {
      coreId: Math.trunc(coreId),
      metaJson:
        metaJson && typeof metaJson === 'object' && !Array.isArray(metaJson)
          ? (metaJson as Record<string, unknown>)
          : {},
    };
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
   * Lists config audit history for a config object and its related child entities.
   *
   * Includes rows for the object itself plus fields, field rules, views, panels,
   * relationships, lifecycles/transitions, runtime field metadata, and status
   * mappings. Sorted by `changedAt` descending.
   */
  async listConfigAuditLogs(params: {
    tenantId: number | null | undefined;
    configObjectId: number;
    entityType?: ConfigAuditEntityType;
    action?: 'create' | 'update' | 'delete';
    page?: number;
    limit?: number;
  }): Promise<ConfigAuditLogListResult> {
    const {
      tenantId,
      configObjectId,
      entityType,
      action,
      page: pageInput,
      limit: limitInput,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const page =
      typeof pageInput === 'number' && pageInput >= 1 ? pageInput : 1;
    const rawLimit =
      typeof limitInput === 'number' && limitInput > 0
        ? limitInput
        : CONFIG_AUDIT_LIST_DEFAULT_LIMIT;
    const limit = Math.min(rawLimit, CONFIG_AUDIT_LIST_MAX_LIMIT);

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId },
    });

    if (!configObject) {
      throw new RpcException('Config object not found.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: { configTemplateSetId: configObject.configTemplateSetId },
    });

    // Global PUBLISHED packs (HVAC demo, platform tenant settings) are readable in
    // tenant scope — same rule as Object Designer object load.
    if (
      !templateSet ||
      !this.isTemplateSetAccessibleForScope(templateSet, effectiveTenantId)
    ) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    const relatedIdsByType = await this.resolveConfigAuditRelatedEntityIds(
      configObjectId,
      configObject.objectType,
    );

    const qb = this.configAuditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.changedByUser', 'changedByUser')
      .leftJoinAndSelect('changedByUser.user', 'changedByUserUser')
      .orderBy('audit.changedAt', 'DESC')
      .addOrderBy('audit.configAuditLogId', 'DESC');

    if (effectiveTenantId !== null) {
      qb.andWhere(
        new Brackets((tenantScope) => {
          tenantScope
            .where('audit.tenantId = :effectiveTenantId', {
              effectiveTenantId,
            })
            .orWhere('audit.tenantId IS NULL');
        }),
      );
    }

    qb.andWhere(
      new Brackets((entityScope) => {
        const typesToQuery: ConfigAuditEntityType[] = entityType
          ? [entityType]
          : (Object.keys(relatedIdsByType) as ConfigAuditEntityType[]);

        let clauseIndex = 0;
        for (const type of typesToQuery) {
          const ids = relatedIdsByType[type] ?? [];
          if (!ids.length) {
            continue;
          }
          const typeParam = `entityType_${clauseIndex}`;
          const idsParam = `entityIds_${clauseIndex}`;
          const clause = `(audit.entityType = :${typeParam} AND audit.entityId IN (:...${idsParam}))`;
          if (clauseIndex === 0) {
            entityScope.where(clause, {
              [typeParam]: type,
              [idsParam]: ids,
            });
          } else {
            entityScope.orWhere(clause, {
              [typeParam]: type,
              [idsParam]: ids,
            });
          }
          clauseIndex += 1;
        }

        // No related IDs for the requested filter → force empty result set.
        if (clauseIndex === 0) {
          entityScope.where('1 = 0');
        }
      }),
    );

    if (action) {
      qb.andWhere('audit.action = :action', { action });
    }

    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const items = rows.map((row) => this.mapConfigAuditLogListItem(row));
    const pagination = buildRuntimeV2ListPagination(page, limit, total, limit);

    return {
      items,
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Collects entity IDs for all config child types owned by `configObjectId`.
   */
  private async resolveConfigAuditRelatedEntityIds(
    configObjectId: number,
    objectType: string,
  ): Promise<Record<ConfigAuditEntityType, number[]>> {
    const [
      fields,
      views,
      relationships,
      lifecycles,
      lifecycleTransitions,
      runtimeFieldMetadata,
      statusMappings,
    ] = await Promise.all([
      this.configObjectFieldRepository.find({
        where: { configObjectId },
        select: ['configObjectFieldId'],
      }),
      this.viewRepository.find({
        where: { configObjectId },
        select: ['configObjectViewId'],
      }),
      this.relationshipRepository.find({
        where: { fromObjectType: objectType },
        select: ['configObjectRelationshipId'],
      }),
      this.lifecycleRepository.find({
        where: { configObjectId },
        select: ['configObjectLifecycleId'],
      }),
      this.lifecycleTransitionRepository.find({
        where: { configObjectId },
        select: ['configObjectLifecycleTransitionId'],
      }),
      this.runtimeFieldMetadataRepository.find({
        where: { configObjectId },
        select: ['configObjectRuntimeFieldMetadataId'],
      }),
      this.configObjectStatusMappingRepository.find({
        where: { configObjectId },
        select: ['configObjectStatusMappingId'],
      }),
    ]);

    const fieldIds = fields.map((row) => Number(row.configObjectFieldId));
    const viewIds = views.map((row) => Number(row.configObjectViewId));

    const [fieldRules, panels] = await Promise.all([
      fieldIds.length
        ? this.configObjectFieldRuleRepository.find({
            where: { configObjectFieldId: In(fieldIds) },
            select: ['configObjectFieldRuleId'],
          })
        : Promise.resolve([] as ConfigObjectFieldRuleEntity[]),
      viewIds.length
        ? this.panelRepository.find({
            where: { configObjectViewId: In(viewIds) },
            select: ['configObjectViewPanelId'],
          })
        : Promise.resolve([] as ConfigObjectViewPanelEntity[]),
    ]);

    return {
      object: [configObjectId],
      field: fieldIds,
      field_rule: fieldRules.map((row) => Number(row.configObjectFieldRuleId)),
      view: viewIds,
      panel: panels.map((row) => Number(row.configObjectViewPanelId)),
      relationship: relationships.map((row) =>
        Number(row.configObjectRelationshipId),
      ),
      lifecycle: lifecycles.map((row) => Number(row.configObjectLifecycleId)),
      lifecycle_transition: lifecycleTransitions.map((row) =>
        Number(row.configObjectLifecycleTransitionId),
      ),
      runtime_field_metadata: runtimeFieldMetadata.map((row) =>
        Number(row.configObjectRuntimeFieldMetadataId),
      ),
      status_mapping: statusMappings.map((row) =>
        Number(row.configObjectStatusMappingId),
      ),
    };
  }

  private mapConfigAuditLogListItem(
    row: ConfigAuditLogEntity,
  ): ConfigAuditLogListItem {
    const user = row.changedByUser?.user;
    const changedByDisplayName =
      user?.displayName?.trim() ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      user?.email?.trim() ||
      null;

    return {
      configAuditLogId: Number(row.configAuditLogId),
      tenantId:
        typeof row.tenantId === 'number' && row.tenantId > 0
          ? Number(row.tenantId)
          : null,
      entityType: row.entityType,
      entityId: Number(row.entityId),
      action: row.action,
      oldValue: row.oldValue ?? null,
      newValue: row.newValue ?? null,
      changedBy: Number(row.changedBy),
      changedByDisplayName: changedByDisplayName || null,
      changedAt:
        row.changedAt instanceof Date
          ? row.changedAt.toISOString()
          : String(row.changedAt),
    };
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
        : templateSetFilterId
          ? [
              {
                configTemplateSetId: templateSetFilterId,
                tenantId: effectiveTenantId,
              },
              {
                configTemplateSetId: templateSetFilterId,
                tenantId: IsNull(),
              },
            ]
          : [
              { tenantId: effectiveTenantId },
              { tenantId: IsNull(), status: 'PUBLISHED' as const },
            ];

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
    const canonicalObjectType =
      this.normalizeCanonicalObjectTypeOrThrow(objectType);

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

    if (
      nextObjectType !==
      this.normalizeCanonicalObjectTypeOrThrow(existing.objectType)
    ) {
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
    const storedTenantId = resolveStoredTenantId(tenantId);

    await this.getStandaloneConfigObjectForTenant(
      configObjectId,
      configScopeTenantId(storedTenantId),
    );

    return this.customObjectInstanceRepository.find({
      where: {
        tenantId: storedTenantId,
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
    const storedTenantId = resolveStoredTenantId(tenantId);

    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId,
        tenantId: storedTenantId,
      },
    });

    if (!row) {
      return null;
    }

    await this.getStandaloneConfigObjectForTenant(
      row.configObjectId,
      configScopeTenantId(storedTenantId),
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
    const storedTenantId = resolveStoredTenantId(tenantId);

    const configObject = await this.getStandaloneConfigObjectForTenant(
      configObjectId,
      configScopeTenantId(storedTenantId),
    );

    let nextPayload = this.normalizeCustomInstancePayload(payload);
    nextPayload = await this.normalizeStandaloneInstanceAttachmentPayload({
      tenantId: configScopeTenantId(storedTenantId),
      objectType: configObject.objectType,
      payload: nextPayload,
    });

    const nextStatus: ConfigCustomObjectInstanceStatus =
      typeof status === 'string' ? status : 'DRAFT';

    const entity = this.customObjectInstanceRepository.create({
      tenantId: storedTenantId,
      configObjectId: configObject.configObjectId,
      payload: nextPayload,
      status: nextStatus,
      createdBy,
      updatedBy: null,
    });

    const saved = await this.customObjectInstanceRepository.save(entity);

    await this.logConfigChange(
      storedTenantId,
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

    this.eventsService.emit(
      PLATFORM_EVENT_NAMES.CONFIG_OBJECT_INSTANCE_CREATED,
      buildStandaloneConfigObjectInstanceCreatedOptions({
        configCustomObjectInstanceId: saved.configCustomObjectInstanceId,
        configObjectId: saved.configObjectId,
        objectType: configObject.objectType,
        tenantId: saved.tenantId,
        actorUserId: createdBy,
        status: saved.status,
      }),
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
    tenantUserId?: number;
    payload?: Record<string, unknown>;
    status?: ConfigCustomObjectInstanceStatus;
  }): Promise<ConfigCustomObjectInstanceEntity> {
    const {
      tenantId,
      configCustomObjectInstanceId,
      updatedBy,
      tenantUserId,
      payload,
      status,
    } = params;
    const storedTenantId = resolveStoredTenantId(tenantId);

    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId,
        tenantId: storedTenantId,
      },
    });

    if (!row) {
      throw new RpcException('Custom object instance not found.');
    }

    // G3: when this instance is bound to a process step, require the caller to hold the step lock.
    // Super-admin / platform actors may omit tenantUserId; locks are acquired with userId in that case.
    const boundStepId = await this.stepLocks.resolveStepIdForCustomObjectInstance(
      configCustomObjectInstanceId,
    );
    if (boundStepId) {
      await this.stepLocks.assertCanMutateStep({
        stepInstanceId: boundStepId,
        tenantUserId: tenantUserId ?? updatedBy,
      });
    }

    const configObject = await this.getStandaloneConfigObjectForTenant(
      row.configObjectId,
      configScopeTenantId(storedTenantId),
    );

    const oldValue = {
      status: row.status,
      payload: row.payload,
    };

    const previousMediaPaths =
      typeof payload !== 'undefined'
        ? collectMediaPathsFromValue(oldValue.payload)
        : [];

    if (typeof payload !== 'undefined') {
      let nextPayload = this.normalizeCustomInstancePayload(payload);
      nextPayload = await this.normalizeStandaloneInstanceAttachmentPayload({
        tenantId: configScopeTenantId(storedTenantId),
        objectType: configObject.objectType,
        payload: nextPayload,
      });
      row.payload = nextPayload;
    }
    if (typeof status === 'string') {
      row.status = status;
    }

    row.updatedBy = updatedBy;

    const changedFields: string[] = [];
    if (typeof payload !== 'undefined') {
      changedFields.push('payload');
    }
    if (typeof status === 'string') {
      changedFields.push('status');
    }

    const saved = await this.customObjectInstanceRepository.save(row);

    if (typeof payload !== 'undefined') {
      await this.mediaService.deleteRemovedPaths(
        previousMediaPaths,
        collectMediaPathsFromValue(saved.payload),
      );
    }

    await this.logConfigChange(
      storedTenantId,
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

    this.eventsService.emit(
      PLATFORM_EVENT_NAMES.CONFIG_OBJECT_INSTANCE_UPDATED,
      buildStandaloneConfigObjectInstanceUpdatedOptions({
        configCustomObjectInstanceId: saved.configCustomObjectInstanceId,
        configObjectId: saved.configObjectId,
        objectType: configObject.objectType,
        tenantId: saved.tenantId,
        actorUserId: updatedBy,
        status: saved.status,
        changedFields,
      }),
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
    const storedTenantId = resolveStoredTenantId(tenantId);

    const row = await this.customObjectInstanceRepository.findOne({
      where: {
        configCustomObjectInstanceId,
        tenantId: storedTenantId,
      },
    });

    if (!row) {
      return;
    }

    const configObject = await this.getStandaloneConfigObjectForTenant(
      row.configObjectId,
      configScopeTenantId(storedTenantId),
    );

    const oldValue = {
      configObjectId: row.configObjectId,
      tenantId: row.tenantId,
      status: row.status,
      payload: row.payload,
    };

    this.eventsService.emit(
      PLATFORM_EVENT_NAMES.CONFIG_OBJECT_INSTANCE_DELETED,
      buildStandaloneConfigObjectInstanceDeletedOptions({
        configCustomObjectInstanceId,
        configObjectId: row.configObjectId,
        objectType: configObject.objectType,
        tenantId: row.tenantId,
        actorUserId: deletedBy,
        status: row.status,
      }),
    );

    const mediaPaths = collectMediaPathsFromValue(row.payload);
    await this.customObjectInstanceRepository.remove(row);
    if (mediaPaths.length > 0) {
      await this.mediaService.deleteRemovedPaths(mediaPaths, []);
    }

    await this.logConfigChange(
      storedTenantId,
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

    const normalizedFieldKey = normalizeConfigObjectFieldKey(fieldKey);
    assertPersistableConfigObjectFieldKey(normalizedFieldKey);

    const existing = await this.configObjectFieldRepository.findOne({
      where: {
        configObjectId,
        fieldKey: normalizedFieldKey,
      },
    });

    if (existing) {
      throw new RpcException(
        `Config field with key "${normalizedFieldKey}" already exists on object.`,
      );
    }

    const field = this.configObjectFieldRepository.create({
      configObjectId,
      fieldKey: normalizedFieldKey,
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
      existing.validationJson =
        this.applyDerivedDisplayAuthoringInValidationJson(validationJson);
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
   * Lists runtime field metadata overlays for a `system_table` config object.
   */
  async listRuntimeFieldMetadata(params: {
    tenantId: number | null | undefined;
    objectType: string;
  }): Promise<ConfigObjectRuntimeFieldMetadataEntity[]> {
    const configObject = await this.resolveSystemTableConfigObjectForMetadata(
      params,
    );

    return this.runtimeFieldMetadataRepository.find({
      where: { configObjectId: configObject.configObjectId },
      order: { fieldKey: 'ASC' },
    });
  }

  /**
   * Creates or updates runtime field metadata for one existing `system_table` column key.
   */
  async upsertRuntimeFieldMetadata(params: {
    tenantId: number | null | undefined;
    objectType: string;
    fieldKey: string;
    validationJson: Record<string, unknown>;
    rulesJson?: Record<string, unknown> | null;
    updatedBy: number;
  }): Promise<ConfigObjectRuntimeFieldMetadataEntity> {
    const {
      tenantId,
      objectType,
      fieldKey,
      validationJson,
      rulesJson,
      updatedBy,
    } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const configObject = await this.resolveSystemTableConfigObjectForMetadata({
      tenantId,
      objectType,
    });
    const canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(
      objectType,
    );
    const normalizedFieldKey = fieldKey.trim();
    if (!normalizedFieldKey) {
      throw new RpcException(
        'field_key cannot be empty after trimming.',
      );
    }
    this.assertSystemTableRuntimeFieldKeyKnown(
      canonicalObjectType,
      normalizedFieldKey,
    );

    const normalizedValidationJson =
      this.applyRuntimeFieldMetadataValidationJson(validationJson);
    const normalizedRulesJson =
      typeof rulesJson === 'undefined'
        ? undefined
        : this.normalizeFieldRulesJson(rulesJson);

    const existing = await this.runtimeFieldMetadataRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        fieldKey: normalizedFieldKey,
      },
    });

    if (!existing) {
      const created = await this.runtimeFieldMetadataRepository.save(
        this.runtimeFieldMetadataRepository.create({
          configObjectId: configObject.configObjectId,
          fieldKey: normalizedFieldKey,
          validationJson: normalizedValidationJson,
          rulesJson:
            typeof normalizedRulesJson === 'undefined'
              ? null
              : normalizedRulesJson,
          createdBy: updatedBy,
          updatedBy,
        }),
      );

      await this.logConfigChange(
        effectiveTenantId,
        'runtime_field_metadata',
        created.configObjectRuntimeFieldMetadataId,
        'create',
        updatedBy,
        null,
        {
          configObjectId: created.configObjectId,
          objectType: canonicalObjectType,
          fieldKey: created.fieldKey,
          validationJson: created.validationJson ?? null,
          rulesJson: created.rulesJson ?? null,
        },
      );
      await this.invalidateRuntimeCachesAfterMetadataChange({
        tenantId: effectiveTenantId,
        objectType: canonicalObjectType,
      });
      return created;
    }

    const oldValue = {
      configObjectId: existing.configObjectId,
      objectType: canonicalObjectType,
      fieldKey: existing.fieldKey,
      validationJson: existing.validationJson ?? null,
      rulesJson: existing.rulesJson ?? null,
    };

    existing.validationJson = normalizedValidationJson;
    if (typeof normalizedRulesJson !== 'undefined') {
      existing.rulesJson = normalizedRulesJson;
    }
    existing.updatedBy = updatedBy;

    const saved = await this.runtimeFieldMetadataRepository.save(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'runtime_field_metadata',
      saved.configObjectRuntimeFieldMetadataId,
      'update',
      updatedBy,
      oldValue,
      {
        configObjectId: saved.configObjectId,
        objectType: canonicalObjectType,
        fieldKey: saved.fieldKey,
        validationJson: saved.validationJson ?? null,
        rulesJson: saved.rulesJson ?? null,
      },
    );
    await this.invalidateRuntimeCachesAfterMetadataChange({
      tenantId: effectiveTenantId,
      objectType: canonicalObjectType,
    });
    return saved;
  }

  /**
   * Removes a runtime field metadata overlay (idempotent).
   */
  async deleteRuntimeFieldMetadata(params: {
    tenantId: number | null | undefined;
    objectType: string;
    fieldKey: string;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, objectType, fieldKey, deletedBy } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const configObject = await this.resolveSystemTableConfigObjectForMetadata({
      tenantId,
      objectType,
    });
    const canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(
      objectType,
    );
    const normalizedFieldKey = fieldKey.trim();
    if (!normalizedFieldKey) {
      throw new RpcException(
        'field_key cannot be empty after trimming.',
      );
    }

    const existing = await this.runtimeFieldMetadataRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        fieldKey: normalizedFieldKey,
      },
    });

    if (!existing) {
      return;
    }

    const oldValue = {
      configObjectId: existing.configObjectId,
      objectType: canonicalObjectType,
      fieldKey: existing.fieldKey,
      validationJson: existing.validationJson ?? null,
      rulesJson: existing.rulesJson ?? null,
    };

    await this.runtimeFieldMetadataRepository.remove(existing);

    await this.logConfigChange(
      effectiveTenantId,
      'runtime_field_metadata',
      existing.configObjectRuntimeFieldMetadataId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
    await this.invalidateRuntimeCachesAfterMetadataChange({
      tenantId: effectiveTenantId,
      objectType: canonicalObjectType,
    });
  }

  private async resolveSystemTableConfigObjectForMetadata(params: {
    tenantId: number | null | undefined;
    objectType: string;
  }): Promise<ConfigObjectEntity> {
    const effectiveTenantId = this.getEffectiveTenantId(params.tenantId);
    const canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(
      params.objectType,
    );
    const candidateObjectTypes = this.buildCandidateObjectTypes(
      params.objectType,
      canonicalObjectType,
    );

    const templateSet =
      await this.findTemplateSetForAuthoringScope(effectiveTenantId);
    if (!templateSet) {
      throw new RpcException('Config object not found.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configTemplateSetId: templateSet.configTemplateSetId,
        objectType: In(candidateObjectTypes),
        status: In(AUTHORABLE_CONFIG_OBJECT_STATUSES),
      },
    });

    if (!configObject) {
      throw new RpcException('Config object not found.');
    }

    const scopedTemplateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForTenantScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });
    if (!scopedTemplateSet) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    if (configObject.bindingMode !== 'system_table') {
      throw authoringRpcException(
        AuthoringErrorCode.RuntimeFieldMetadataBindingModeInvalid,
        CONFIG_OBJECT_RUNTIME_FIELD_METADATA_BINDING_FORBIDDEN_MESSAGE,
      );
    }

    return configObject;
  }

  private assertSystemTableRuntimeFieldKeyKnown(
    objectType: string,
    fieldKey: string,
  ): void {
    const baseKeys = new Set(
      generateBaseCoreFieldDescriptors({
        bindingMode: 'system_table',
        objectType,
      }).map((descriptor) => descriptor.fieldKey),
    );

    if (!baseKeys.has(fieldKey)) {
      throw authoringRpcException(
        AuthoringErrorCode.RuntimeFieldMetadataUnknownFieldKey,
        `field_key "${fieldKey}" is not a known base column for object type "${objectType}".`,
      );
    }
  }

  private applyRuntimeFieldMetadataValidationJson(
    validationJson: Record<string, unknown>,
  ): Record<string, unknown> {
    const hasLookup = Object.prototype.hasOwnProperty.call(
      validationJson,
      '_six1LookupSelectAuthoring',
    );
    const hasDerived = Object.prototype.hasOwnProperty.call(
      validationJson,
      '_six1DerivedRuntimeAuthoring',
    );

    if (hasLookup && hasDerived) {
      throw authoringRpcException(
        AuthoringErrorCode.RuntimeFieldMetadataLookupDerivedExclusive,
        'Lookup-select and derived-runtime authoring are mutually exclusive per field.',
      );
    }

    return this.applyDerivedDisplayAuthoringInValidationJson(validationJson) ?? {};
  }

  private async invalidateRuntimeCachesAfterMetadataChange(params: {
    tenantId: number | null;
    objectType: string;
  }): Promise<void> {
    await this.invalidateRuntimeCaches({
      tenantId: params.tenantId ?? undefined,
      entityKey: params.objectType,
      includeSchemaCache: true,
      includeViewCache: false,
      includeManifestCache: true,
    });
  }

  private async loadFieldViewsForSchemaBinding(
    configObject: ConfigObjectEntity,
  ): Promise<ConfigObjectFieldView[]> {
    if (configObject.bindingMode === 'system_table') {
      return this.loadRuntimeFieldMetadataAsFieldViews(
        configObject.configObjectId,
      );
    }
    return this.loadFieldViewsForConfigObjectId(configObject.configObjectId);
  }

  private async loadRuntimeFieldMetadataAsFieldViews(
    configObjectId: number,
  ): Promise<ConfigObjectFieldView[]> {
    const rows = await this.runtimeFieldMetadataRepository.find({
      where: { configObjectId },
      order: { fieldKey: 'ASC' },
    });

    return rows.map((row) => this.runtimeFieldMetadataRowToFieldView(row));
  }

  private runtimeFieldMetadataRowToFieldView(
    row: ConfigObjectRuntimeFieldMetadataEntity,
  ): ConfigObjectFieldView {
    const field = {
      configObjectFieldId: row.configObjectRuntimeFieldMetadataId,
      configObjectId: row.configObjectId,
      fieldKey: row.fieldKey,
      label: row.fieldKey,
      description: null,
      fieldType: 'text',
      validationJson: row.validationJson,
      defaultValue: null,
      isRequired: false,
      isSystem: false,
      orderIndex: 0,
      sectionKey: null,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as ConfigObjectFieldEntity;

    return {
      field,
      rules: [],
    };
  }

  private normalizeFieldRulesJson(
    rulesJson: unknown,
  ): Record<string, unknown> | null {
    if (rulesJson === undefined) {
      return null;
    }
    try {
      const normalized = validateFieldRulesJson(rulesJson);
      return normalized as Record<string, unknown> | null;
    } catch (error) {
      if (error instanceof FieldRulesValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.FieldRulesInvalid,
          error.message,
        );
      }
      throw error;
    }
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
      where: {
        configObjectStatusMappingId: params.configObjectStatusMappingId,
      },
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
      where: {
        configObjectStatusMappingId: params.configObjectStatusMappingId,
      },
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
      const next = validateFieldValidationJson({ ...validationJson });
      if (
        Object.prototype.hasOwnProperty.call(
          next,
          '_six1DerivedDisplayAuthoring',
        )
      ) {
        next._six1DerivedDisplayAuthoring =
          validateDerivedDisplayAuthoringMetadata(
            next._six1DerivedDisplayAuthoring,
          );
      }
      if (
        Object.prototype.hasOwnProperty.call(next, '_six1LookupSelectAuthoring')
      ) {
        const lookup = validateLookupSelectAuthoringMetadata(
          next._six1LookupSelectAuthoring,
        );
        this.assertReferenceListDataRefOnSave(lookup.dataRef);
        next._six1LookupSelectAuthoring = lookup;
      }
      if (
        Object.prototype.hasOwnProperty.call(
          next,
          '_six1DerivedRuntimeAuthoring',
        )
      ) {
        next._six1DerivedRuntimeAuthoring =
          validateDerivedRuntimeAuthoringMetadata(
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
      if (error instanceof FieldValidationJsonValidationError) {
        throw authoringRpcException(
          AuthoringErrorCode.FieldValidationInvalid,
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
      return normalizeQueryConfigJoinTable(
        normalizeQueryConfigInlineRelation({ ...queryConfig }),
      );
    } catch (error) {
      mapRelationAuthoringErrorToRpc(error);
    }
  }

  private enrichManyToManyRelationDescriptor(
    rel: RelationDescriptor,
  ): RelationDescriptor {
    if (rel.cardinality !== 'many_to_many') {
      return rel;
    }
    if (
      rel.queryConfig &&
      typeof rel.queryConfig.join_table === 'string' &&
      rel.queryConfig.join_table.trim()
    ) {
      return rel;
    }

    const rootEntity = resolveEntityClassForObjectType(rel.fromObjectType);
    const relatedEntity = resolveEntityClassForObjectType(rel.toObjectType);
    if (!rootEntity || !relatedEntity) {
      return rel;
    }

    const joinConfig = resolveManyToManyJoinConfig(this.dataSource, {
      rootEntityClass: rootEntity as Type<object>,
      relatedEntityClass: relatedEntity as Type<object>,
      queryConfig: rel.queryConfig ?? {},
    });
    if (!joinConfig) {
      return rel;
    }

    return {
      ...rel,
      queryConfig: {
        ...(rel.queryConfig ?? {}),
        ...manyToManyJoinConfigToQueryConfig(joinConfig),
      },
    };
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

  private async assertRelationshipEndpointsInAuthoringScope(
    tenantId: number | null | undefined,
    fromObjectType: string,
    toObjectType: string,
  ): Promise<void> {
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const templateSet = await this.findTemplateSetForAuthoringScope(
      effectiveTenantId,
    );
    if (!templateSet) {
      throw authoringRpcException(
        AuthoringErrorCode.RelationPublishedEndpoints,
        'No active config template set found for relationship authoring scope.',
      );
    }

    const [from, to] = await Promise.all([
      this.configObjectRepository.findOne({
        where: {
          configTemplateSetId: templateSet.configTemplateSetId,
          objectType: fromObjectType,
          status: In(AUTHORABLE_CONFIG_OBJECT_STATUSES),
        },
      }),
      this.configObjectRepository.findOne({
        where: {
          configTemplateSetId: templateSet.configTemplateSetId,
          objectType: toObjectType,
          status: In(AUTHORABLE_CONFIG_OBJECT_STATUSES),
        },
      }),
    ]);
    if (!from) {
      throw authoringRpcException(
        AuthoringErrorCode.RelationPublishedEndpoints,
        `fromObjectType "${fromObjectType}" must exist as a DRAFT or PUBLISHED configurable object.`,
      );
    }
    if (!to) {
      throw authoringRpcException(
        AuthoringErrorCode.RelationPublishedEndpoints,
        `toObjectType "${toObjectType}" must exist as a DRAFT or PUBLISHED configurable object.`,
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
      const existing = byKey.get(row.relationshipKey);
      if (existing?.relationshipSource === 'orm') {
        // Pack/designer rows intentionally mirror ORM keys (e.g. platform_tenant_settings
        // tenant_billing_info). Prefer authored metadata for Object Runner panels.
        this.logger.debug(
          `Relationship key "${row.relationshipKey}" on "${objectType}" exists in ORM and designer catalogs; using designer.`,
        );
      } else if (existing && existing.relationshipSource === 'designer') {
        throw authoringRpcException(
          AuthoringErrorCode.RelationConfigInvalid,
          `Duplicate designer relationship key "${row.relationshipKey}" for "${objectType}".`,
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

    return Array.from(byKey.values())
      .map((rel) => this.enrichManyToManyRelationDescriptor(rel))
      .sort((a, b) => a.relationshipKey.localeCompare(b.relationshipKey));
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
    const schema = await this.getObjectSchema(
      effectiveTenantId,
      rel.toObjectType,
    );
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

    await this.assertRelationshipEndpointsInAuthoringScope(
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

    await this.assertRelationshipEndpointsInAuthoringScope(
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

    await this.assertRelationshipEndpointsInAuthoringScope(
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
    // Multiple template sets may define the same objectType (e.g. system_setting_group).
    // findOne() would arbitrarily pick one row and hide views authored on the others.
    const configObjects = await this.configObjectRepository.find({
      where: {
        objectType,
      },
    });

    if (configObjects.length === 0) {
      return [];
    }

    return this.viewRepository.find({
      where: {
        configObjectId: In(configObjects.map(o => o.configObjectId)),
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

    const configObjects = await this.configObjectRepository.find({
      where: {
        objectType,
      },
    });

    if (configObjects.length === 0) {
      return [];
    }

    const scopedIds: number[] = [];
    for (const configObject of configObjects) {
      const templateSet = await this.templateSetRepository.findOne({
        where: this.templateSetWhereForTenantScope(
          configObject.configTemplateSetId,
          effectiveTenantId,
        ),
      });
      if (templateSet) {
        scopedIds.push(configObject.configObjectId);
      }
    }

    if (scopedIds.length === 0) {
      throw new RpcException(
        'Config object does not belong to the specified tenant.',
      );
    }

    return this.viewRepository.find({
      where: {
        configObjectId: In(scopedIds),
      },
      order: {
        viewType: 'ASC',
        isDefault: 'DESC',
        configObjectViewId: 'ASC',
      } as any,
      relations: ['panels'],
    });
  }

  private formatDisplayNameForObjectType(objectType: string): string {
    return objectType
      .split('_')
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveSorTableNameForConfigObject(
    canonicalObjectType: string,
  ): string {
    const entityClass = resolveEntityClassForObjectType(canonicalObjectType);
    if (entityClass) {
      const tableName = resolveObjectTypeForEntityClass(entityClass);
      if (tableName) {
        return tableName;
      }
    }

    throw new RpcException(
      `Unable to resolve SoR table for object type "${canonicalObjectType}".`,
    );
  }

  private async findTemplateSetForAuthoringScope(
    effectiveTenantId: number | null,
  ): Promise<ConfigTemplateSetEntity | null> {
    const where =
      effectiveTenantId === null
        ? { status: In(AUTHORABLE_TEMPLATE_SET_STATUSES) }
        : {
            tenantId: effectiveTenantId,
            status: In(AUTHORABLE_TEMPLATE_SET_STATUSES),
          };

    let templateSet = await this.templateSetRepository.findOne({
      where,
      order: { configTemplateSetId: 'ASC' },
    });

    if (!templateSet && effectiveTenantId !== null) {
      templateSet = await this.templateSetRepository.findOne({
        where: {
          tenantId: IsNull(),
          status: In(AUTHORABLE_TEMPLATE_SET_STATUSES),
        },
        order: { configTemplateSetId: 'ASC' },
      });
    }

    return templateSet;
  }

  /**
   * Resolves an authorable `config_objects` row for view authoring, auto-provisioning
   * platform `system_table` definitions as `DRAFT` when they are missing.
   */
  private async ensureConfigObjectForViewAuthoring(params: {
    objectType: string;
    effectiveTenantId: number | null;
    createdBy: number;
  }): Promise<ConfigObjectEntity> {
    const canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(
      params.objectType,
    );

    const templateSet = await this.findTemplateSetForAuthoringScope(
      params.effectiveTenantId,
    );
    if (!templateSet) {
      throw new RpcException(
        'Config template set not found for view creation.',
      );
    }

    const existing = await this.configObjectRepository.findOne({
      where: {
        configTemplateSetId: templateSet.configTemplateSetId,
        objectType: canonicalObjectType,
        status: In(AUTHORABLE_CONFIG_OBJECT_STATUSES),
      },
    });
    if (existing) {
      return existing;
    }

    if (!isSystemTableObjectType(canonicalObjectType)) {
      throw new RpcException('Config object not found for view creation.');
    }

    const sorTableName =
      this.resolveSorTableNameForConfigObject(canonicalObjectType);

    const created = await this.configObjectRepository.save(
      this.configObjectRepository.create({
        configTemplateSetId: templateSet.configTemplateSetId,
        objectType: canonicalObjectType,
        bindingMode: 'system_table',
        sorTableName,
        displayName: this.formatDisplayNameForObjectType(canonicalObjectType),
        description: null,
        status: 'DRAFT',
      }),
    );

    await this.logConfigChange(
      params.effectiveTenantId,
      'object',
      created.configObjectId,
      'create',
      params.createdBy,
      null,
      {
        objectType: created.objectType,
        bindingMode: created.bindingMode,
        sorTableName: created.sorTableName,
        displayName: created.displayName,
        description: created.description ?? null,
        status: created.status,
        configTemplateSetId: created.configTemplateSetId,
        autoProvisioned: true,
      },
    );

    return created;
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

    const configObject = await this.ensureConfigObjectForViewAuthoring({
      objectType,
      effectiveTenantId,
      createdBy,
    });

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
   * Whether a template set is readable for the effective tenant scope.
   * - Tenant scope: own sets, or global PUBLISHED sets.
   * - Global/superadmin scope (`effectiveTenantId === null`): any authorable set.
   */
  private isTemplateSetAccessibleForScope(
    templateSet: ConfigTemplateSetEntity,
    effectiveTenantId: number | null,
  ): boolean {
    const status = String(templateSet.status ?? '')
      .trim()
      .toUpperCase() as ConfigTemplateSetEntity['status'];
    // TypeORM may surface bigint `tenant_id` as string; treat nullish/0 as global.
    const rawTenantId = templateSet.tenantId as number | string | null | undefined;
    const ownedTenantId =
      rawTenantId == null || rawTenantId === ''
        ? null
        : Number(rawTenantId);
    const normalizedOwnedTenantId =
      ownedTenantId != null && Number.isFinite(ownedTenantId) && ownedTenantId >= 1
        ? Math.trunc(ownedTenantId)
        : null;

    if (effectiveTenantId === null) {
      return AUTHORABLE_TEMPLATE_SET_STATUSES.includes(status);
    }
    if (normalizedOwnedTenantId === effectiveTenantId) {
      return AUTHORABLE_TEMPLATE_SET_STATUSES.includes(status);
    }
    // Global PUBLISHED packs are readable in tenant Object Designer scope.
    return normalizedOwnedTenantId === null && status === 'PUBLISHED';
  }

  private objectTypeMatchesEntityKey(
    objectType: string,
    entityKey: string,
    candidateObjectTypes: string[],
  ): boolean {
    const normalized = objectType?.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (candidateObjectTypes.includes(normalized)) {
      return true;
    }
    try {
      return (
        this.normalizeCanonicalObjectTypeOrThrow(objectType) ===
        this.normalizeCanonicalObjectTypeOrThrow(entityKey)
      );
    } catch {
      return false;
    }
  }

  private async findConfigObjectInTemplateSet(params: {
    configTemplateSetId: number;
    candidateObjectTypes: string[];
  }): Promise<ConfigObjectEntity | null> {
    return this.configObjectRepository.findOne({
      where: {
        configTemplateSetId: params.configTemplateSetId,
        objectType: In(params.candidateObjectTypes),
        status: In(AUTHORABLE_CONFIG_OBJECT_STATUSES),
      },
      order: { configObjectId: 'ASC' },
    });
  }

  /**
   * Read-safe: returns a `config_object` visible in the tenant/global scope, or `null`
   * when the type is unknown or not accessible (avoids 500s on list-only view reads).
   *
   * Prefer explicit pack selectors when multiple template sets share the same
   * `objectType` (e.g. default customer id 3 vs HVAC customer id 30):
   * 1. `configObjectId`
   * 2. `configTemplateSetId` / `templateSetKey`
   * 3. Unscoped fallback: first object found by walking published template sets
   *    (tenant-owned ASC, then global ASC) — deterministic, not bare findOne.
   */
  private async tryResolveConfigObjectForEntityScope(params: {
    entityKey: string;
    effectiveTenantId: number | null;
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): Promise<ConfigObjectEntity | null> {
    const {
      entityKey,
      effectiveTenantId,
      configObjectId,
      configTemplateSetId,
      templateSetKey,
    } = params;

    let canonicalObjectType: string;
    try {
      canonicalObjectType = this.normalizeCanonicalObjectTypeOrThrow(entityKey);
    } catch {
      return null;
    }
    const candidateObjectTypes = this.buildCandidateObjectTypes(
      entityKey,
      canonicalObjectType,
    );

    if (
      typeof configObjectId === 'number' &&
      Number.isFinite(configObjectId) &&
      configObjectId >= 1
    ) {
      const byId = await this.configObjectRepository.findOne({
        where: { configObjectId: Math.trunc(configObjectId) },
      });
      if (!byId) {
        return null;
      }
      if (
        !AUTHORABLE_CONFIG_OBJECT_STATUSES.includes(byId.status) ||
        !this.objectTypeMatchesEntityKey(
          byId.objectType,
          entityKey,
          candidateObjectTypes,
        )
      ) {
        return null;
      }
      const templateSet = await this.templateSetRepository.findOne({
        where: { configTemplateSetId: byId.configTemplateSetId },
      });
      if (
        !templateSet ||
        !this.isTemplateSetAccessibleForScope(templateSet, effectiveTenantId)
      ) {
        return null;
      }
      return byId;
    }

    let resolvedTemplateSetId: number | null = null;
    if (
      typeof configTemplateSetId === 'number' &&
      Number.isFinite(configTemplateSetId) &&
      configTemplateSetId >= 1
    ) {
      resolvedTemplateSetId = Math.trunc(configTemplateSetId);
    } else {
      const key = templateSetKey?.trim();
      if (key) {
        let keyedSet: ConfigTemplateSetEntity | null = null;
        if (effectiveTenantId !== null) {
          keyedSet = await this.templateSetRepository.findOne({
            where: { key, tenantId: effectiveTenantId },
          });
        }
        if (!keyedSet) {
          keyedSet = await this.templateSetRepository.findOne({
            where: {
              key,
              tenantId: IsNull(),
              status: In(AUTHORABLE_TEMPLATE_SET_STATUSES),
            },
            order: { configTemplateSetId: 'ASC' },
          });
        }
        if (!keyedSet) {
          return null;
        }
        resolvedTemplateSetId = keyedSet.configTemplateSetId;
      }
    }

    if (resolvedTemplateSetId != null) {
      const templateSet = await this.templateSetRepository.findOne({
        where: { configTemplateSetId: resolvedTemplateSetId },
      });
      if (
        !templateSet ||
        !this.isTemplateSetAccessibleForScope(templateSet, effectiveTenantId)
      ) {
        return null;
      }
      return this.findConfigObjectInTemplateSet({
        configTemplateSetId: resolvedTemplateSetId,
        candidateObjectTypes,
      });
    }

    if (effectiveTenantId !== null) {
      const tenantSets = await this.templateSetRepository.find({
        where: {
          tenantId: effectiveTenantId,
          status: In(AUTHORABLE_TEMPLATE_SET_STATUSES),
        },
        order: { configTemplateSetId: 'ASC' },
      });
      for (const set of tenantSets) {
        const owned = await this.findConfigObjectInTemplateSet({
          configTemplateSetId: set.configTemplateSetId,
          candidateObjectTypes,
        });
        if (owned) {
          return owned;
        }
      }
    }

    const globalWhere =
      effectiveTenantId === null
        ? {
            status: 'PUBLISHED' as const,
          }
        : {
            tenantId: IsNull(),
            status: 'PUBLISHED' as const,
          };

    const globalSets = await this.templateSetRepository.find({
      where: globalWhere,
      order: { configTemplateSetId: 'ASC' },
    });
    for (const set of globalSets) {
      const found = await this.findConfigObjectInTemplateSet({
        configTemplateSetId: set.configTemplateSetId,
        candidateObjectTypes,
      });
      if (found) {
        return found;
      }
    }

    return null;
  }

  /** Write / strict resolution; throws when the entity is unknown or tenant scope mismatches. */
  private async resolveConfigObjectForEntityScope(params: {
    entityKey: string;
    effectiveTenantId: number | null;
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): Promise<ConfigObjectEntity> {
    const { entityKey } = params;
    const configObject =
      await this.tryResolveConfigObjectForEntityScope(params);

    if (!configObject) {
      const probe = await this.configObjectRepository.findOne({
        where: { objectType: entityKey },
      });
      if (!probe) {
        throw new RpcException(
          `Config object not found for entityKey "${entityKey}".`,
        );
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
    const { configObjectId, viewType, tenantId, exceptConfigObjectViewId } =
      params;

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
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): Promise<ConfigObjectViewEntity | null> {
    const {
      tenantId,
      entityKey,
      viewType,
      configObjectId,
      configTemplateSetId,
      templateSetKey,
    } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    this.clearExpiredRuntimeCaches();
    const cacheKey = this.getActiveViewCacheKey({
      tenantId: effectiveTenantId,
      entityKey,
      viewType,
      configObjectId,
      configTemplateSetId,
      templateSetKey,
    });
    const cached = this.activeViewCache.get(cacheKey);
    if (cached && this.isFresh(cached.expiresAt)) {
      return cached.value;
    }

    const configObject = await this.tryResolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
      configObjectId,
      configTemplateSetId,
      templateSetKey,
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
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): Promise<ConfigObjectViewEntity[]> {
    const {
      tenantId,
      entityKey,
      configObjectId,
      configTemplateSetId,
      templateSetKey,
    } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const configObject = await this.tryResolveConfigObjectForEntityScope({
      entityKey,
      effectiveTenantId,
      configObjectId,
      configTemplateSetId,
      templateSetKey,
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
    configObjectId?: number;
    configTemplateSetId?: number;
    templateSetKey?: string;
  }): Promise<ConfigObjectRuntimeManifestView> {
    const {
      tenantId,
      entityKey,
      includeDiagnostics = true,
      configObjectId,
      configTemplateSetId,
      templateSetKey,
    } = params;
    const effectiveTenantId = this.getEffectiveTenantId(tenantId);
    const packScope = {
      configObjectId,
      configTemplateSetId,
      templateSetKey,
    };
    this.clearExpiredRuntimeCaches();
    const cacheKey = this.getRuntimeManifestCacheKey({
      tenantId: effectiveTenantId,
      entityKey,
      includeDiagnostics,
      ...packScope,
    });
    const cached = this.runtimeManifestCache.get(cacheKey);
    if (cached && this.isFresh(cached.expiresAt)) {
      return cached.value;
    }
    const schema = await this.getObjectSchema(
      effectiveTenantId,
      entityKey,
      packScope,
    );

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
        ...packScope,
      }),
      this.getActiveScopedConfigView({
        tenantId: effectiveTenantId,
        entityKey,
        viewType: 'detail',
        ...packScope,
      }),
      this.getActiveScopedConfigView({
        tenantId: effectiveTenantId,
        entityKey,
        viewType: 'form',
        ...packScope,
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
      typeof params.tenantId === 'number'
        ? this.getEffectiveTenantId(params.tenantId)
        : null;
    const includeSchemaCache = params.includeSchemaCache ?? true;
    const includeViewCache = params.includeViewCache ?? true;
    const includeManifestCache = params.includeManifestCache ?? true;
    const tenantPart = `${effectiveTenantId ?? 'global'}::`;
    const entityPart = params.entityKey ? `::${params.entityKey}` : null;
    const matches = (key: string): boolean => {
      const tenantMatch =
        typeof params.tenantId === 'number' ? key.startsWith(tenantPart) : true;
      const entityMatch = params.entityKey
        ? key.includes(entityPart as string)
        : true;
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

    for (const [fieldKey, rawValue] of Object.entries(fieldValues ?? {})) {
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

      let value: unknown = rawValue;
      if (
        typeof descriptor.fieldType === 'string' &&
        descriptor.fieldType.trim().toLowerCase() === 'attachment'
      ) {
        const normalized = normalizeAttachmentFieldValue(
          value,
          descriptor.mediaConstraints?.maxFiles,
        );
        if (!normalized.ok) {
          throw new RpcException({
            code: RuntimeErrorCode.SubmitFieldInvalid,
            message: `Invalid attachment value for field "${fieldKey}": ${normalized.message}`,
          });
        }
        value = normalized.value;
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
      const exists = Object.prototype.hasOwnProperty.call(
        fieldValues ?? {},
        descriptor.fieldKey,
      );
      if (!exists) {
        missingRequiredFields.push(descriptor.fieldKey);
        continue;
      }

      if (
        typeof descriptor.fieldType === 'string' &&
        descriptor.fieldType.trim().toLowerCase() === 'attachment'
      ) {
        const value = (fieldValues ?? {})[descriptor.fieldKey];
        const normalized = normalizeAttachmentFieldValue(
          value,
          descriptor.mediaConstraints?.maxFiles,
        );
        if (!normalized.ok) {
          missingRequiredFields.push(descriptor.fieldKey);
        }
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
        this.setValueAtPath(
          payload,
          this.getInlineRelationPath(rel),
          relationValue,
        );
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
    if (
      !manifestRaw ||
      typeof manifestRaw !== 'object' ||
      Array.isArray(manifestRaw)
    ) {
      throw new RpcException({
        code: RuntimeErrorCode.RelationActionUnknown,
        message: `Relation manifest not found for relationKey "${relationKey}".`,
      });
    }
    const manifest = manifestRaw as Record<string, unknown>;
    const actions =
      manifest.actions &&
      typeof manifest.actions === 'object' &&
      !Array.isArray(manifest.actions)
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
        ? (manifest.requiredPermissionsByActionRef as Record<string, unknown>)[
            actionRef
          ]
        : [];
    const requiredPermissions = Array.isArray(requiredPermissionsRaw)
      ? requiredPermissionsRaw.filter(
          (p): p is string => typeof p === 'string' && p.trim().length > 0,
        )
      : [];
    const missingPermissions = requiredPermissions.filter(
      (p) => !grantedPermissions.has(p),
    );
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
      relatedFieldRegistryByRelationKey:
        schema.relatedFieldRegistryByRelationKey ?? {},
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
      if (
        fieldView.field.defaultValue !== null &&
        fieldView.field.defaultValue !== undefined
      ) {
        baseSource[fieldView.field.fieldKey] = fieldView.field
          .defaultValue as unknown;
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
    const boardCardSubtitleFields =
      normalizedList.board?.cardSubtitleFields ?? [];

    const tableColumnDescriptors = tableColumnFieldKeys
      .map((fieldKey) => fieldByKey.get(fieldKey))
      .filter((descriptor): descriptor is CoreFieldDescriptor =>
        Boolean(descriptor),
      );

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
    viewType: ConfigObjectViewType;
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

    const fieldRegistryByKey = new Set(
      schema.fieldRegistry.map((f) => f.fieldKey),
    );
    const relationKeys = new Set(
      (schema.relations ?? []).map((r) => r.relationshipKey),
    );
    for (const panel of orderedPanels) {
      const panelFieldKeys = this.extractFieldKeysFromPanelLayout(panel);
      const relationKey = this.extractRelationKeyFromPanel(panel);
      const isFormSectionRelationPanel =
        relationKey !== null && panel.panelType === 'form-section';

      if (isFormSectionRelationPanel) {
        if (!relationKeys.has(relationKey)) {
          diagnostics.push({
            code: RuntimeErrorCode.RelationKeyUnresolved,
            message: `${viewType} panel "${panel.panelKey}" references unknown relation "${relationKey}".`,
            level: 'warn',
            refType: 'relationKey',
            refKey: relationKey,
          });
        }

        if (relationKey && !(schema.relationManifestsByKey ?? {})[relationKey]) {
          diagnostics.push({
            code: RuntimeErrorCode.RelationKeyUnresolved,
            message: `${viewType} panel "${panel.panelKey}" references relation "${relationKey}" without relation manifest metadata.`,
            level: 'warn',
            refType: 'relationKey',
            refKey: relationKey,
          });
        }

        const relatedRegistry = schema.relatedFieldRegistryByRelationKey?.[relationKey] ?? null;
        if (!relatedRegistry) {
          diagnostics.push({
            code: RuntimeErrorCode.RelationKeyUnresolved,
            message: `${viewType} panel "${panel.panelKey}" references relation "${relationKey}" without related field registry metadata.`,
            level: 'warn',
            refType: 'relationKey',
            refKey: relationKey,
          });
        } else {
          const relatedFieldKeys = new Set(relatedRegistry.map((d) => d.fieldKey));
          for (const fieldKey of panelFieldKeys) {
            if (!relatedFieldKeys.has(fieldKey)) {
              diagnostics.push({
                code: RuntimeErrorCode.FieldKeyUnresolved,
                message: `${viewType} panel "${panel.panelKey}" references unknown related field "${relationKey}::${fieldKey}".`,
                level: 'warn',
                refType: 'fieldKey',
                refKey: fieldKey,
              });
            }
          }
        }
        continue;
      }

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
        if (relationKey && !(schema.relationManifestsByKey ?? {})[relationKey]) {
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
        manifestBlock &&
        typeof manifestBlock === 'object' &&
        !Array.isArray(manifestBlock)
          ? (manifestBlock as Record<string, unknown>)
          : {};
      relationQueryDefaultsByKey[relationKey] =
        this.normalizeRuntimeRelationQueryDefaults(
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
  ): {
    page: number;
    limit: number;
    depth: number;
    sort: unknown;
    filters: unknown;
  } {
    const obj =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    const pageRaw = Number(obj.page);
    const limitRaw = Number(obj.limit);
    const depthRaw = Number(obj.depth);
    let page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    let limit =
      Number.isInteger(limitRaw) && limitRaw >= 1
        ? limitRaw
        : this.runtimeRelationMaxPageSize;
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
        this.assertNoForbiddenInlineFieldAuthoringKeysInViewConfig(
          nextConfigJson,
        );
      }
      if (
        viewType === 'list' &&
        nextConfigJson !== null &&
        typeof nextConfigJson === 'object' &&
        !Array.isArray(nextConfigJson)
      ) {
        nextConfigJson =
          this.normalizeListViewConfigJsonOrThrow(nextConfigJson);
      }
      if (
        (viewType === 'detail' || viewType === 'form') &&
        nextConfigJson !== null &&
        typeof nextConfigJson === 'object' &&
        !Array.isArray(nextConfigJson)
      ) {
        nextConfigJson =
          this.normalizeDetailFormViewConfigJsonOrThrow(nextConfigJson);
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
      existing.roleKey =
        typeof roleKey === 'undefined' ? existing.roleKey : roleKey;
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
      this.assertNoForbiddenInlineFieldAuthoringKeysInViewConfig(
        finalConfigJson,
      );
    }
    if (
      viewType === 'list' &&
      finalConfigJson !== null &&
      typeof finalConfigJson === 'object' &&
      !Array.isArray(finalConfigJson)
    ) {
      finalConfigJson =
        this.normalizeListViewConfigJsonOrThrow(finalConfigJson);
    }
    if (
      (viewType === 'detail' || viewType === 'form') &&
      finalConfigJson !== null &&
      typeof finalConfigJson === 'object' &&
      !Array.isArray(finalConfigJson)
    ) {
      finalConfigJson =
        this.normalizeDetailFormViewConfigJsonOrThrow(finalConfigJson);
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
    const { tenantId, entityKey, viewType, configObjectViewId, updatedBy } =
      params;
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
    const { tenantId, entityKey, viewType, configObjectViewId, updatedBy } =
      params;
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
      finalLayoutConfig =
        this.normalizePanelLayoutConfigOrThrow(finalLayoutConfig);
    }
    this.assertPanelTypeMatchesDisplayMode(panelType, finalLayoutConfig);
    this.assertRelationMembershipPanelLayoutOrThrow(
      panelType,
      finalLayoutConfig,
    );

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
        nextLayoutConfig =
          this.normalizePanelLayoutConfigOrThrow(nextLayoutConfig);
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
    /** Archived packs stay in DB for history but must not clutter pickers. */
    const activeStatuses = ['DRAFT', 'PUBLISHED', 'CONFLICT'] as const;

    if (normalizedTenantId === null) {
      // Super admin / global scope: all non-archived template sets.
      return this.templateSetRepository.find({
        where: {
          status: In([...activeStatuses]),
        },
        order: {
          configTemplateSetId: 'ASC',
        },
      });
    }

    return this.templateSetRepository.find({
      where: [
        { tenantId: normalizedTenantId, status: In([...activeStatuses]) },
        { tenantId: IsNull(), status: 'PUBLISHED' },
      ],
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
   * Helper method that loads a core entity and optional sor_bound meta JSON.
   * Core rows resolve via {@link loadCoreEntityFromRegistry}; meta remains
   * explicit for types that use JSON meta tables.
   */
  private async loadCoreAndMeta(
    objectType: string,
    coreId: number,
  ): Promise<{
    coreEntity: SupportedConfigObjectCoreEntity | null;
    metaJson: Record<string, unknown> | null;
  }> {
    const coreEntity = (await loadCoreEntityFromRegistry(
      this.dataSource,
      objectType,
      coreId,
    )) as SupportedConfigObjectCoreEntity | null;

    if (!coreEntity) {
      return { coreEntity: null, metaJson: null };
    }

    const metaJson = await this.loadSorBoundMetaJson(objectType, coreId);
    return { coreEntity, metaJson };
  }

  /**
   * JSON meta row for sor_bound types only. `system_table` types return `null`.
   */
  private async loadSorBoundMetaJson(
    objectType: string,
    coreId: number,
  ): Promise<Record<string, unknown> | null> {
    const descriptor = getSorMetaTableDescriptor(objectType);
    if (!descriptor) {
      return null;
    }

    const row = await this.dataSource
      .getRepository(descriptor.metaEntity)
      .findOne({
        where: { [descriptor.coreIdProperty]: coreId } as Record<string, unknown>,
      });

    if (!row) {
      return null;
    }

    const metaJson = (row as Record<string, unknown>)[descriptor.metaJsonProperty];
    if (
      !metaJson ||
      typeof metaJson !== 'object' ||
      Array.isArray(metaJson)
    ) {
      return null;
    }

    return metaJson as Record<string, unknown>;
  }
}

function normalizeAttachmentFieldValue(
  value: unknown,
  maxFiles?: number,
):
  | { ok: true; value: MediaRef | MediaRef[] }
  | { ok: false; message: string } {
  if (!isValidMediaFieldValue(value)) {
    return {
      ok: false,
      message:
        'expected { path: string, ... }, legacy { key: string, ... }, or an array of those',
    };
  }

  const items = Array.isArray(value) ? value : [value];
  const effectiveMax = maxFiles ?? 1;
  if (items.length > effectiveMax) {
    return {
      ok: false,
      message: `exceeds maxFiles (${effectiveMax})`,
    };
  }

  const normalized: MediaRef[] = [];
  for (const item of items) {
    const ref = normalizeMediaRef(item);
    if (!ref) {
      return { ok: false, message: 'invalid media ref entry' };
    }
    normalized.push(ref);
  }

  return {
    ok: true,
    value: Array.isArray(value) ? normalized : normalized[0],
  };
}
