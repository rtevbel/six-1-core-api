import { getMetadataStorage, ValidationTypes } from 'class-validator';

import type { FieldWriteCapability } from './field-write-capability.types';
import { resolveDtoPairForObjectType } from './object-type-dto.registry';

function inferRequiredPropertyNames(dtoClass: Function): Set<string> {
  const storage = getMetadataStorage();
  const metas = storage.getTargetValidationMetadatas(dtoClass, '', false, false);
  const grouped = storage.groupByPropertyName(metas);
  const required = new Set<string>();

  for (const [propertyName, propertyMetas] of Object.entries(grouped)) {
    const hasOptional = propertyMetas.some(
      (m) =>
        m.type === ValidationTypes.CONDITIONAL_VALIDATION &&
        m.name === 'isOptional',
    );
    const hasRequiredLike = propertyMetas.some(
      (m) =>
        m.name === 'isNotEmpty' ||
        m.type === ValidationTypes.IS_DEFINED ||
        m.name === 'isDefined',
    );

    if (!hasOptional && hasRequiredLike) {
      required.add(propertyName);
    }
  }

  return required;
}

function inferAllValidatedPropertyNames(dtoClass: Function): Set<string> {
  const storage = getMetadataStorage();
  const metas = storage.getTargetValidationMetadatas(dtoClass, '', false, false);
  return new Set(metas.map((m) => m.propertyName));
}

export function inferDtoCapabilityOverridesForObjectType(
  objectType: string,
): Partial<Record<string, FieldWriteCapability>> {
  const pair = resolveDtoPairForObjectType(objectType);
  if (!pair) {
    return {};
  }

  const createProps = pair.createDto
    ? inferAllValidatedPropertyNames(pair.createDto)
    : new Set<string>();
  const updateProps = pair.updateDto
    ? inferAllValidatedPropertyNames(pair.updateDto)
    : new Set<string>();
  const requiredOnCreate = pair.createDto
    ? inferRequiredPropertyNames(pair.createDto)
    : new Set<string>();
  const requiredOnUpdate = pair.updateDto
    ? inferRequiredPropertyNames(pair.updateDto)
    : new Set<string>();

  const keys = new Set([
    ...Array.from(createProps),
    ...Array.from(updateProps),
    ...Array.from(requiredOnCreate),
    ...Array.from(requiredOnUpdate),
  ]);

  const out: Partial<Record<string, FieldWriteCapability>> = {};
  for (const key of keys) {
    out[key] = {
      canCreate: createProps.has(key),
      canUpdate: updateProps.has(key),
      requiredOnCreate: requiredOnCreate.has(key),
      requiredOnUpdate: requiredOnUpdate.has(key),
    };
  }

  return out;
}
