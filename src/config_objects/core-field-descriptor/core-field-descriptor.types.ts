import type { SorFieldPrimitiveType } from '../sor-field-descriptors.registry';
import type {
  CoreFieldDerivedRuntimeConfig,
  CoreFieldLookupSelectConfig,
} from './core-field-descriptor.runtime-metadata.types';

/**
 * Normalized catalog field descriptor for configurable objects (`sor_bound`,
 * `system_table`, and merged custom fields). Used by authoring validation and,
 * later, manifest composition (see object-designer-authoring plan).
 *
 * Capability flags attach after write-schema merge (A-4); optional fields stay
 * absent when unknown so callers can distinguish “unset” from `false`.
 */
export interface CoreFieldDescriptor {
  /** Stable key matching entity property name or authored `field_key`. */
  fieldKey: string;
  /** Display label for builder and runner. */
  label: string;
  /** Presentation / validation family; aligned with SoR registry primitives. */
  fieldType: SorFieldPrimitiveType;
  /** Ascending ordering within its section (SoR vs custom merge uses policy elsewhere). */
  orderIndex: number;
  /** When true, shown in catalog but must not appear in writable patches if enforced upstream. */
  readOnly?: boolean;
  /** Whether create payloads may include this path (after write-schema merge). */
  canCreate?: boolean;
  /** Whether update payloads may include this path. */
  canUpdate?: boolean;
  /** Explicit required-on-create after merge with write-schema / DTO rules. */
  requiredOnCreate?: boolean;
  /** Explicit required-on-update after merge with write-schema / DTO rules. */
  requiredOnUpdate?: boolean;
  /**
   * Nested path for relation-block payload mapping (e.g. nested DTO fragments),
   * dot or bracket notation as enforced by downstream composer.
   */
  path?: string;
  /** Form/layout grouping from `config_object_fields.section_key` when present. */
  sectionKey?: string | null;
  /** Longer help text from `config_object_fields.description`. */
  description?: string | null;
  /** Optional lookup/select metadata for runner form option binding. */
  lookupSelectConfig?: CoreFieldLookupSelectConfig;
  /** Optional derived-value runtime metadata (e.g. concat/coalesce). */
  derivedRuntimeConfig?: CoreFieldDerivedRuntimeConfig;
}
