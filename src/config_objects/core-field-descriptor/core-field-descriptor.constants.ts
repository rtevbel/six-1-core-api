import type { SorFieldPrimitiveType } from '../sor-field-descriptors.registry';

/**
 * Canonical list of primitive field types for {@link CoreFieldDescriptor}.
 * Must stay aligned with {@link SorFieldPrimitiveType} in the SoR registry.
 */
export const CORE_FIELD_PRIMITIVE_TYPES = [
  'text',
  'textarea',
  'number',
  'boolean',
  'date',
  'select',
  'json',
  'attachment',
] as const satisfies readonly SorFieldPrimitiveType[];
