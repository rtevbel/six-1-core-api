import type { ConfigObjectResolvedInstance } from './interfaces/config-object-resolved-instance.interface';
import { generateBaseCoreFieldDescriptorsFromEntityMetadata } from './core-field-descriptor/core-field-descriptor.generator';
import { getSorFieldDescriptors } from './sor-field-descriptors.registry';

export type ConfigObjectResolutionMode =
  | 'standalone'
  | 'sor_bound'
  | 'system_table';

/**
 * Flat map of core columns only (no meta / designer custom fields).
 * Used for `system_table` completion rules and binding validation.
 *
 * SoR-bound types use the code-first descriptor registry; `system_table` types
 * (e.g. `tenant`) use TypeORM entity column metadata.
 */
export function buildCoreOnlyFieldSnapshot(
  objectType: string,
  core: Record<string, unknown>,
): Record<string, unknown> {
  const sorDescriptors = getSorFieldDescriptors(objectType);
  const fieldKeys =
    sorDescriptors.length > 0
      ? sorDescriptors.map((descriptor) => descriptor.fieldKey)
      : generateBaseCoreFieldDescriptorsFromEntityMetadata(objectType).map(
          (descriptor) => descriptor.fieldKey,
        );

  const fields: Record<string, unknown> = {};
  for (const fieldKey of fieldKeys) {
    if (Object.prototype.hasOwnProperty.call(core, fieldKey)) {
      fields[fieldKey] = core[fieldKey];
    }
  }
  return fields;
}

/**
 * Flat field map from a resolved config object instance for completion rules.
 * `sor_bound` merges core + meta; `standalone` uses dynamicFields only.
 */
export function buildMergedFieldSnapshot(
  resolved: ConfigObjectResolvedInstance,
): Record<string, unknown> {
  if (resolved.resolutionMode === 'standalone') {
    return { ...resolved.dynamicFields };
  }

  const registry = resolved.schema?.fieldRegistry ?? [];
  const fields: Record<string, unknown> = {};
  const core = resolved.core as unknown as Record<string, unknown>;
  const sorFieldKeys = new Set(
    (resolved.schema.mergedFieldOrder ?? [])
      .filter((entry) => entry.source === 'sor')
      .map((entry) => entry.fieldKey),
  );

  for (const descriptor of registry) {
    const fieldKey = descriptor.fieldKey;
    if (
      sorFieldKeys.has(fieldKey) &&
      Object.prototype.hasOwnProperty.call(core, fieldKey)
    ) {
      fields[fieldKey] = core[fieldKey];
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(resolved.dynamicFields, fieldKey)) {
      fields[fieldKey] = resolved.dynamicFields[fieldKey];
    }
  }

  for (const [fieldKey, value] of Object.entries(resolved.dynamicFields)) {
    if (!Object.prototype.hasOwnProperty.call(fields, fieldKey)) {
      fields[fieldKey] = value;
    }
  }

  return fields;
}

/**
 * Builds the field snapshot used by binding completion rules for a resolution mode.
 */
export function buildCompletenessFieldSnapshot(
  resolutionMode: ConfigObjectResolutionMode,
  params: {
    objectType: string;
    resolved?: ConfigObjectResolvedInstance | null;
    core?: Record<string, unknown> | null;
  },
): Record<string, unknown> {
  if (resolutionMode === 'system_table') {
    return buildCoreOnlyFieldSnapshot(
      params.objectType,
      params.core ?? {},
    );
  }

  if (!params.resolved) {
    return {};
  }

  if (resolutionMode === 'standalone') {
    return buildMergedFieldSnapshot(params.resolved);
  }

  return buildMergedFieldSnapshot(params.resolved);
}

/** @deprecated Prefer {@link buildMergedFieldSnapshot}; kept for process executor imports. */
export function buildFieldsFromResolvedInstance(
  resolved: ConfigObjectResolvedInstance,
): Record<string, unknown> {
  return buildMergedFieldSnapshot(resolved);
}
