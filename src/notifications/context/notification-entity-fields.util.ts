import type { ConfigObjectResolvedInstance } from '../../config_objects/interfaces/config-object-resolved-instance.interface';

const DISPLAY_LABEL_FIELD_KEYS = [
  'name',
  'companyName',
  'displayName',
  'title',
  'label',
] as const;

/**
 * Builds a flat `entity.fields` map from a resolved config object instance.
 */
export function buildEntityFieldsFromResolvedInstance(
  resolved: ConfigObjectResolvedInstance,
): Record<string, unknown> {
  const registry = resolved.schema?.fieldRegistry ?? [];
  const fields: Record<string, unknown> = {};

  if (resolved.resolutionMode === 'standalone') {
    return { ...resolved.dynamicFields };
  }

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
 * Resolves a human-readable label from hydrated entity fields.
 */
export function resolveEntityDisplayLabel(
  fields: Record<string, unknown>,
): string | null {
  for (const key of DISPLAY_LABEL_FIELD_KEYS) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
