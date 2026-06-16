export const PROCESS_STEP_EXECUTION_EVENTS = [
  'step_ready',
  'step_started',
  'step_completed',
  'step_canceled',
  'step_blocked',
  'step_skipped',
  'step_failed',
  'step_retry',
  'step_rollback',
] as const;

export type ProcessStepExecutionEvent =
  (typeof PROCESS_STEP_EXECUTION_EVENTS)[number];

export const PROCESS_STEP_EXECUTION_CAUSES = [
  'manual',
  'event',
  'timer',
  'system',
] as const;

export type ProcessStepExecutionCause =
  (typeof PROCESS_STEP_EXECUTION_CAUSES)[number];

export function mapEngineStateToExecutionEvent(
  newStatus: string,
): ProcessStepExecutionEvent | null {
  switch (newStatus) {
    case 'ready':
      return 'step_ready';
    case 'in_progress':
      return 'step_started';
    case 'completed':
      return 'step_completed';
    case 'canceled':
      return 'step_canceled';
    case 'blocked':
      return 'step_blocked';
    case 'skipped':
      return 'step_skipped';
    case 'failed':
      return 'step_failed';
    default:
      return null;
  }
}
