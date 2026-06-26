/** When a process step action runs relative to orchestrator lifecycle. */
export const PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED =
  'step_completed' as const;
export const PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED =
  'process_completed' as const;
export const PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED = 'step_failed' as const;

export const PROCESS_STEP_ACTION_RUN_ON_VALUES = [
  PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
  PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
  PROCESS_STEP_ACTION_RUN_ON_STEP_FAILED,
] as const;

export type ProcessStepActionRunOn =
  (typeof PROCESS_STEP_ACTION_RUN_ON_VALUES)[number];

export const PROCESS_STEP_ACTION_TYPE_EMIT_EVENT = 'emit_event' as const;
export const PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION =
  'send_notification' as const;
export const PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD =
  'update_sor_field' as const;
export const PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK = 'call_webhook' as const;
export const PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN =
  'generate_verification_token' as const;

export const PROCESS_STEP_ACTION_TYPES = [
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
  PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
  PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
] as const;

export type ProcessStepActionType = (typeof PROCESS_STEP_ACTION_TYPES)[number];

const RUN_ON_SET = new Set<string>(PROCESS_STEP_ACTION_RUN_ON_VALUES);
const ACTION_TYPE_SET = new Set<string>(PROCESS_STEP_ACTION_TYPES);

export function isProcessStepActionRunOn(
  value: string,
): value is ProcessStepActionRunOn {
  return RUN_ON_SET.has(value);
}

export function isProcessStepActionType(
  value: string,
): value is ProcessStepActionType {
  return ACTION_TYPE_SET.has(value);
}
