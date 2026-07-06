import type { ConfigObjectBindingMode } from '../entities/config_object.entity';
import type { ConfigObjectFieldView } from '../interfaces/config-object-resolved-instance.interface';
import { getSorFieldDescriptors } from '../sor-field-descriptors.registry';

import { buildMergedCoreFieldDescriptors } from './core-field-descriptor.merge';
import type { CoreFieldDescriptor } from './core-field-descriptor.types';
import { inferDtoCapabilityOverridesForObjectType } from './dto-write-capability.util';
import type { FieldWriteCapability } from './field-write-capability.types';
import { validateCoreFieldDescriptor } from './core-field-descriptor.validator';

function isDerivedDisplayOnly(descriptor: CoreFieldDescriptor): boolean {
  if (!descriptor.derivedRuntimeConfig) {
    return false;
  }
  return descriptor.derivedRuntimeConfig.displayOnly !== false;
}

/** Inferred defaults for create/update eligibility before explicit overrides. */
export interface InferredWriteCapability {
  canCreate: boolean;
  canUpdate: boolean;
}

/**
 * Derives default create/update flags from binding mode and SoR metadata.
 *
 * - **`readOnly`** descriptors (merged layer): no writes.
 * - **`sor_bound` / SoR column**: writable unless SoR registry marks `readOnly`.
 * - **`sor_bound` / custom meta field**: meta JSON is patchable (`canCreate`/`canUpdate` true).
 * - **`standalone`**: payload fields are writable unless `readOnly`.
 * - **`system_table`**: writable by default for non-readOnly columns; refined by
 *   explicit write-schema/DTO overrides when available.
 */
export function inferWriteCapabilityForDescriptor(params: {
  bindingMode: ConfigObjectBindingMode;
  objectType: string;
  descriptor: CoreFieldDescriptor;
  /** When true, field exists only in `config_object_fields`, not in SoR registry keys. */
  isCustomOnly: boolean;
}): InferredWriteCapability {
  const { bindingMode, objectType, descriptor, isCustomOnly } = params;

  if (descriptor.readOnly === true) {
    return { canCreate: false, canUpdate: false };
  }

  if (isDerivedDisplayOnly(descriptor)) {
    return { canCreate: false, canUpdate: false };
  }

  if (bindingMode === 'system_table') {
    return { canCreate: true, canUpdate: true };
  }

  if (bindingMode === 'standalone') {
    return { canCreate: true, canUpdate: true };
  }

  // sor_bound
  if (isCustomOnly) {
    return { canCreate: true, canUpdate: true };
  }

  const sor = getSorFieldDescriptors(objectType).find(
    (s) => s.fieldKey === descriptor.fieldKey,
  );
  if (sor?.readOnly === true) {
    return { canCreate: false, canUpdate: false };
  }

  return { canCreate: true, canUpdate: true };
}

/**
 * Applies inferred write capabilities plus optional **registry/DTO overrides**
 * (for example generated from Nest `CreateXDto` / `UpdateXDto` metadata in a later iteration).
 *
 * Preserves `requiredOnCreate` / `requiredOnUpdate` from the A-3 merge unless an
 * override supplies new values for that field key.
 */
export function mergeWriteSchemaCapabilities(
  descriptors: CoreFieldDescriptor[],
  params: {
    bindingMode: ConfigObjectBindingMode;
    objectType: string;
    overrides?: Partial<Record<string, FieldWriteCapability>>;
  },
): CoreFieldDescriptor[] {
  const dtoOverrides = inferDtoCapabilityOverridesForObjectType(params.objectType);
  const sorKeys = new Set(
    getSorFieldDescriptors(params.objectType).map((s) => s.fieldKey),
  );

  return descriptors.map((d) => {
    const isCustomOnly =
      params.bindingMode === 'sor_bound' && !sorKeys.has(d.fieldKey);

    const inferred = inferWriteCapabilityForDescriptor({
      bindingMode: params.bindingMode,
      objectType: params.objectType,
      descriptor: d,
      isCustomOnly,
    });

    const ov = {
      ...dtoOverrides[d.fieldKey],
      ...params.overrides?.[d.fieldKey],
    };

    const next: CoreFieldDescriptor = {
      ...d,
      canCreate:
        d.readOnly === true ? false : ov?.canCreate ?? inferred.canCreate,
      canUpdate:
        d.readOnly === true ? false : ov?.canUpdate ?? inferred.canUpdate,
    };

    if (ov?.requiredOnCreate !== undefined) {
      next.requiredOnCreate = ov.requiredOnCreate;
    }
    if (ov?.requiredOnUpdate !== undefined) {
      next.requiredOnUpdate = ov.requiredOnUpdate;
    }

    return validateCoreFieldDescriptor(next);
  });
}

/**
 * End-to-end: A-2 base → A-3 field merge → A-4 write-schema capabilities.
 */
export function finalizeCoreFieldDescriptors(params: {
  bindingMode: ConfigObjectBindingMode;
  objectType: string;
  fieldViews: ConfigObjectFieldView[];
  capabilityOverrides?: Partial<Record<string, FieldWriteCapability>>;
}): CoreFieldDescriptor[] {
  const merged = buildMergedCoreFieldDescriptors({
    bindingMode: params.bindingMode,
    objectType: params.objectType,
    fieldViews: params.fieldViews,
  });
  return mergeWriteSchemaCapabilities(merged, {
    bindingMode: params.bindingMode,
    objectType: params.objectType,
    overrides: params.capabilityOverrides,
  });
}
