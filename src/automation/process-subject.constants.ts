/**
 * Process instance subject vocabulary (job anchor).
 * @see .cursor/plans/dynamic-process-generalization.plan.md §2.1
 */
export const PROCESS_SUBJECT_TYPE_PROJECT = 'project' as const;

export const PROCESS_SUBJECT_TYPE_SCHEDULED_TASK = 'scheduled_task' as const;

export const PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE =
  'config_custom_object_instance' as const;

export const PROCESS_SUBJECT_TYPE_WORKFLOW = 'workflow' as const;

export const PROCESS_SUBJECT_TYPE_SOR_ENTITY = 'sor_entity' as const;

/** Tier 1 — dedicated host adapters */
export const PROCESS_SUBJECT_TYPES_TIER1 = [
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
] as const;

/** Tier 2 / 3 — generic hosts */
export const PROCESS_SUBJECT_TYPES_GENERIC = [
  PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
  PROCESS_SUBJECT_TYPE_SOR_ENTITY,
] as const;

export const PROCESS_SUBJECT_TYPES = [
  ...PROCESS_SUBJECT_TYPES_TIER1,
  ...PROCESS_SUBJECT_TYPES_GENERIC,
] as const;

export type ProcessSubjectType = (typeof PROCESS_SUBJECT_TYPES)[number];

const SUBJECT_TYPE_SET = new Set<string>(PROCESS_SUBJECT_TYPES);

export function isProcessSubjectType(value: string): value is ProcessSubjectType {
  return SUBJECT_TYPE_SET.has(value);
}
