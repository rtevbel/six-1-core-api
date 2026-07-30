/**
 * Entity types written by `logConfigChange` that belong to a config object tree.
 * Excludes `template_set` (not object-scoped).
 */
export const CONFIG_AUDIT_ENTITY_TYPES = [
  'object',
  'field',
  'field_rule',
  'view',
  'panel',
  'relationship',
  'lifecycle',
  'lifecycle_transition',
  'runtime_field_metadata',
  'status_mapping',
] as const;

export type ConfigAuditEntityType = (typeof CONFIG_AUDIT_ENTITY_TYPES)[number];

export const CONFIG_AUDIT_LIST_DEFAULT_LIMIT = 25;
export const CONFIG_AUDIT_LIST_MAX_LIMIT = 100;
