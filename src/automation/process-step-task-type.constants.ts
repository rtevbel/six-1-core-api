export const PROCESS_STEP_TASK_TYPE_MANUAL = 'manual' as const;
export const PROCESS_STEP_TASK_TYPE_AUTOMATED = 'automated' as const;
export const PROCESS_STEP_TASK_TYPE_CALL_PROCESS = 'call_process' as const;
export const PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT = 'config_object' as const;

export const PROCESS_STEP_TASK_TYPES = [
  PROCESS_STEP_TASK_TYPE_MANUAL,
  PROCESS_STEP_TASK_TYPE_AUTOMATED,
  PROCESS_STEP_TASK_TYPE_CALL_PROCESS,
  PROCESS_STEP_TASK_TYPE_CONFIG_OBJECT,
] as const;

export type ProcessStepTaskType = (typeof PROCESS_STEP_TASK_TYPES)[number];

export const PROCESS_BLOCKED_REASON_WAITING_CHILD = 'waiting_child' as const;

export const CHILD_SUBJECT_POLICY_INHERIT = 'inherit' as const;
export const CHILD_SUBJECT_POLICY_WORKFLOW = 'workflow' as const;
export const CHILD_SUBJECT_POLICY_CONFIG_INSTANCE = 'config_instance' as const;

export const CHILD_SUBJECT_POLICIES = [
  CHILD_SUBJECT_POLICY_INHERIT,
  CHILD_SUBJECT_POLICY_WORKFLOW,
  CHILD_SUBJECT_POLICY_CONFIG_INSTANCE,
] as const;

export type ChildSubjectPolicy = (typeof CHILD_SUBJECT_POLICIES)[number];

export type OnChildFailurePolicy =
  | 'ignore'
  | 'pause_parent'
  | 'fail_parent';
