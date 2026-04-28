import type { ConfigObjectBindingMode } from '../entities/config_object.entity';
import {
  getSorFieldDescriptors,
  type SorFieldDescriptor,
} from '../sor-field-descriptors.registry';
import { getMetadataArgsStorage } from 'typeorm';

import type { CoreFieldDescriptor } from './core-field-descriptor.types';
import { validateCoreFieldDescriptor } from './core-field-descriptor.validator';
import { resolveEntityClassForObjectType } from './object-type-entity.registry';

/**
 * Maps a code-first SoR row to the unified {@link CoreFieldDescriptor} shape.
 * Runs through {@link validateCoreFieldDescriptor} so registry drift surfaces
 * as validation errors during tests or startup checks.
 */
export function mapSorFieldDescriptorToCore(
  sor: SorFieldDescriptor,
): CoreFieldDescriptor {
  const base: CoreFieldDescriptor = {
    fieldKey: sor.fieldKey,
    label: sor.label,
    fieldType: sor.fieldType,
    orderIndex: sor.orderIndex,
  };
  if (sor.readOnly === true) {
    base.readOnly = true;
  }
  return validateCoreFieldDescriptor(base);
}

/**
 * Base descriptors for `sor_bound` types backed by {@link getSorFieldDescriptors}.
 * Unknown `objectType` keys yield an empty array (same as the SoR registry).
 */
export function generateBaseCoreFieldDescriptorsFromSorRegistry(
  objectType: string,
): CoreFieldDescriptor[] {
  const sorted = [...getSorFieldDescriptors(objectType)].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  return sorted.map((sor) => mapSorFieldDescriptorToCore(sor));
}

function inferPrimitiveTypeFromColumn(columnType: unknown): SorFieldDescriptor['fieldType'] {
  const raw = typeof columnType === 'string' ? columnType.toLowerCase() : '';
  if (
    raw.includes('json') ||
    raw === 'simple-json' ||
    raw === 'jsonb' ||
    raw === 'simple-array'
  ) {
    return 'json';
  }
  if (
    raw.includes('date') ||
    raw.includes('time') ||
    raw.includes('timestamp') ||
    raw === 'year'
  ) {
    return 'date';
  }
  if (
    raw.includes('int') ||
    raw === 'bigint' ||
    raw === 'smallint' ||
    raw === 'tinyint' ||
    raw.includes('decimal') ||
    raw.includes('numeric') ||
    raw === 'float' ||
    raw === 'double' ||
    raw === 'real'
  ) {
    return 'number';
  }
  if (raw === 'boolean' || raw === 'bool') {
    return 'boolean';
  }
  if (raw.includes('text')) {
    return 'textarea';
  }
  return 'text';
}

function inferColumnTypeFromMetadata(column: {
  options?: { type?: unknown; enum?: unknown };
  mode?: string;
}): SorFieldDescriptor['fieldType'] {
  if (column.options?.enum != null) {
    return 'select';
  }
  if (column.options?.type === Boolean || column.options?.type === 'bool') {
    return 'boolean';
  }
  if (column.options?.type === Number) {
    return 'number';
  }
  if (column.options?.type === Date) {
    return 'date';
  }
  if (column.options?.type === 'json' || column.options?.type === 'jsonb') {
    return 'json';
  }
  return inferPrimitiveTypeFromColumn(column.options?.type);
}

/**
 * Base descriptors from TypeORM scalar columns for any object type that resolves
 * to a registered entity class.
 */
export function generateBaseCoreFieldDescriptorsFromEntityMetadata(
  objectType: string,
): CoreFieldDescriptor[] {
  const entityClass = resolveEntityClassForObjectType(objectType);
  if (!entityClass) {
    return [];
  }

  const storage = getMetadataArgsStorage();
  const columns = storage.columns
    .filter((c) => c.target === entityClass)
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName));

  return columns.map((col, idx) =>
    validateCoreFieldDescriptor({
      fieldKey: col.propertyName,
      label: col.propertyName
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (m) => m.toUpperCase()),
      fieldType: inferColumnTypeFromMetadata(col),
      orderIndex: (idx + 1) * 10,
      readOnly:
        col.mode === 'createDate' ||
        col.mode === 'updateDate' ||
        col.mode === 'deleteDate' ||
        col.options?.primary === true ||
        col.options?.generated !== undefined,
    }),
  );
}

/**
 * Entry point for **base** field descriptors before overrides (A-3) and write-schema
 * capability merge (A-4).
 *
 * - **`sor_bound`:** emits descriptors from TypeORM entity metadata (same base strategy
 *   as `system_table`), with SoR registry fallback for unmapped legacy object keys.
 * - **`system_table`:** emits descriptors from registered TypeORM entity metadata.
 * - **`standalone`:** empty at base layer; authored fields live in `config_object_fields`
 *   and are merged separately (see attachMergedFieldOrder / future A-3).
 */
export function generateBaseCoreFieldDescriptors(params: {
  bindingMode: ConfigObjectBindingMode;
  objectType: string;
}): CoreFieldDescriptor[] {
  const { bindingMode, objectType } = params;
  if (bindingMode === 'standalone') {
    return [];
  }
  if (bindingMode === 'system_table' || bindingMode === 'sor_bound') {
    const entityBased = generateBaseCoreFieldDescriptorsFromEntityMetadata(objectType);
    if (entityBased.length > 0) {
      return entityBased;
    }
    // Backward-compatible fallback while registry-to-entity coverage is completed.
    if (bindingMode === 'sor_bound') {
      return generateBaseCoreFieldDescriptorsFromSorRegistry(objectType);
    }
    return [];
  }
  return [];
}
