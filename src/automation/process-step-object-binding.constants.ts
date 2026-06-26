/** Template binding mode — how the engine provisions the object at step entry. */
export const PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER =
  'create_on_enter' as const;
export const PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING =
  'use_existing' as const;

export const PROCESS_TEMPLATE_OBJECT_BINDING_MODES = [
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER,
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
] as const;

export type ProcessTemplateObjectBindingMode =
  (typeof PROCESS_TEMPLATE_OBJECT_BINDING_MODES)[number];

/** v1 authoring: create_on_enter defers sor_bound provisioning until first save; standalone provisions on step ready. */
export const PROCESS_TEMPLATE_OBJECT_BINDING_MODES_V1: ProcessTemplateObjectBindingMode[] =
  [PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER];

export const PROCESS_CONFIG_OBJECT_BINDING_MODE_STANDALONE = 'standalone' as const;
export const PROCESS_CONFIG_OBJECT_BINDING_MODE_SOR_BOUND = 'sor_bound' as const;
export const PROCESS_CONFIG_OBJECT_BINDING_MODE_SYSTEM_TABLE =
  'system_table' as const;

export const PROCESS_CONFIG_OBJECT_CORE_LINKED_BINDING_MODES = [
  PROCESS_CONFIG_OBJECT_BINDING_MODE_SOR_BOUND,
  PROCESS_CONFIG_OBJECT_BINDING_MODE_SYSTEM_TABLE,
] as const;

export type ProcessConfigObjectCoreLinkedBindingMode =
  (typeof PROCESS_CONFIG_OBJECT_CORE_LINKED_BINDING_MODES)[number];

export const PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING = 'pending' as const;
export const PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE = 'active' as const;
export const PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID = 'valid' as const;
export const PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED = 'failed' as const;
export const PROCESS_INSTANCE_STEP_OBJECT_STATUS_SKIPPED = 'skipped' as const;

export const PROCESS_INSTANCE_STEP_OBJECT_STATUSES = [
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_SKIPPED,
] as const;

export type ProcessInstanceStepObjectStatus =
  (typeof PROCESS_INSTANCE_STEP_OBJECT_STATUSES)[number];

export const DEFAULT_COMPLETION_RULE: Record<string, unknown> = {
  type: 'payload_valid',
};
