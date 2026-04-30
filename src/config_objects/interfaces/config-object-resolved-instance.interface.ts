import { ProjectEntity } from '../../projects/entities/project.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { CustomerContactInfoEntity } from '../../customers/customer_contact_info/entities/customer_contact_info.entity';
import { ResourceEntity } from '../../scheduler/entities/resource.entity';
import {
  ConfigObjectFieldSchemaSource,
  ConfigObjectResolveInstanceWithHint,
  ConfigObjectRunnerKind,
} from '../config-object-runner';
import {
  CONFIG_OBJECT_FIELD_MERGE_POLICY,
  type MergedConfigFieldOrderEntry,
  type SorFieldDescriptor,
} from '../sor-field-descriptors.registry';
import { ConfigObjectEntity } from '../entities/config_object.entity';
import { ConfigObjectFieldEntity } from '../entities/config_object_field.entity';
import { ConfigObjectFieldRuleEntity } from '../entities/config_object_field_rule.entity';
import type { CoreFieldDescriptor } from '../core-field-descriptor/core-field-descriptor.types';
import type { RelationDescriptor } from './relation-descriptor.interface';

/**
 * Union type for all core system-of-record entities currently supported
 * by the configurable object layer.
 */
export type SupportedConfigObjectCoreEntity =
  | ProjectEntity
  | TaskEntity
  | CustomerEntity
  | CustomerContactInfoEntity
  | ResourceEntity;

/**
 * Lightweight view model that wraps a single field rule.
 */
export interface ConfigObjectFieldRuleView {
  fieldRule: ConfigObjectFieldRuleEntity;
}

/**
 * View model for a configured field, including its definition and
 * all associated rules (visibility, required, read-only, etc.).
 */
export interface ConfigObjectFieldView {
  field: ConfigObjectFieldEntity;
  rules: ConfigObjectFieldRuleView[];
}

/**
 * Resolved configuration schema for a configurable object type.
 */
export interface ConfigObjectSchemaView {
  configObject: ConfigObjectEntity;
  fields: ConfigObjectFieldView[];
}

/**
 * Schema returned by `v0.1_get_config_schema` with Object Runner hints.
 *
 * `runnerKind` matches product naming (`system_entity` for DB `system_table`).
 */
export interface ConfigObjectRunnerSchemaView extends ConfigObjectSchemaView {
  runnerKind: ConfigObjectRunnerKind;
  supportsCustomFields: boolean;
  resolveInstanceWith: ConfigObjectResolveInstanceWithHint;
  fieldSchemaSource: ConfigObjectFieldSchemaSource;
  /** Unified field catalog after base generation, field merge, and write-capability inference. */
  fieldRegistry: CoreFieldDescriptor[];
  /** SoR vs custom ordering policy (always `sor_first_then_custom` when merge is used). */
  fieldMergePolicy: typeof CONFIG_OBJECT_FIELD_MERGE_POLICY;
  /** Code-first SoR column descriptors; empty for `system_table` / unknown types. */
  sorFieldDescriptors: SorFieldDescriptor[];
  /** Authoritative form/list column order: all SoR fields, then all custom fields. */
  mergedFieldOrder: MergedConfigFieldOrderEntry[];
  /** Additive relation catalog for builder/runtime consumption. */
  relations?: RelationDescriptor[];
  /** Related-field registry keyed by `relationshipKey`. */
  relatedFieldRegistryByRelationKey?: Record<string, CoreFieldDescriptor[]>;
  /**
   * Source marker for each related-field registry entry.
   * - `configured_object`: derived from a published `config_object` target
   * - `entity_fallback`: derived from entity/DTO metadata when no target object is configured
   * - `unavailable`: no descriptor source could be resolved (for example junction-only targets)
   */
  relatedFieldRegistrySourceByRelationKey?: Record<
    string,
    'configured_object' | 'entity_fallback' | 'unavailable'
  >;
  /** Persisted relation-manifest metadata keyed by `relationshipKey`. */
  relationManifestsByKey?: Record<string, Record<string, unknown> | null>;
}

/**
 * SoR-backed instance: core row + meta JSON merged with field defaults.
 */
export interface ConfigObjectResolvedSorInstance {
  resolutionMode: 'sor_bound';
  objectType: string;
  coreId: number;
  tenantId: number;
  schema: ConfigObjectRunnerSchemaView;
  core: SupportedConfigObjectCoreEntity;
  dynamicFields: Record<string, unknown>;
  sections: string[];
}

/**
 * Standalone instance: payload JSON from `config_custom_object_instances`
 * merged with field defaults; no core entity.
 */
export interface ConfigObjectResolvedStandaloneInstance {
  resolutionMode: 'standalone';
  objectType: string;
  instanceId: number;
  tenantId: number;
  schema: ConfigObjectRunnerSchemaView;
  dynamicFields: Record<string, unknown>;
  sections: string[];
}

/**
 * Resolved runtime view for either SoR-backed or standalone configurable objects.
 */
export type ConfigObjectResolvedInstance =
  | ConfigObjectResolvedSorInstance
  | ConfigObjectResolvedStandaloneInstance;

export interface RelatedObjectsResult {
  objectType: string;
  coreId: number;
  relationships: Record<string, unknown[]>;
}

/** Result of `v0.1_apply_sor_bound_instance_patch` after a successful transaction. */
export interface ApplySorBoundInstancePatchResult {
  core: SupportedConfigObjectCoreEntity;
  metaJson: Record<string, unknown>;
}
