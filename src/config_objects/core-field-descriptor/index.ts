export {
  CORE_FIELD_PRIMITIVE_TYPES,
} from './core-field-descriptor.constants';
export type { CoreFieldDescriptor } from './core-field-descriptor.types';
export type {
  CoreFieldDerivedRuntimeConfig,
  CoreFieldDerivedRuntimeOperation,
  CoreFieldLookupSelectConfig,
} from './core-field-descriptor.runtime-metadata.types';
export {
  CORE_FIELD_DERIVED_RUNTIME_SCHEMA_VERSION,
  CORE_FIELD_LOOKUP_SELECT_SCHEMA_VERSION,
} from './core-field-descriptor.runtime-metadata.types';
export { CoreFieldDescriptorValidationClass } from './core-field-descriptor.schema';
export {
  CoreFieldDescriptorValidationError,
  validateCoreFieldDescriptor,
  validateCoreFieldDescriptors,
} from './core-field-descriptor.validator';
export {
  generateBaseCoreFieldDescriptors,
  generateBaseCoreFieldDescriptorsFromSorRegistry,
  mapSorFieldDescriptorToCore,
} from './core-field-descriptor.generator';
export {
  buildMergedCoreFieldDescriptors,
  mergeCoreFieldDescriptorsWithFieldViews,
  normalizeCustomFieldType,
} from './core-field-descriptor.merge';
export type { FieldWriteCapability } from './field-write-capability.types';
export type { InferredWriteCapability } from './core-field-descriptor.write-schema';
export {
  finalizeCoreFieldDescriptors,
  inferWriteCapabilityForDescriptor,
  mergeWriteSchemaCapabilities,
} from './core-field-descriptor.write-schema';
