import type { ProcessEngineState } from '../process-engine-state';
import type { ScheduledTaskStatus } from '../../scheduler/constants';

/**
 * Maps process step engine states to scheduled_tasks.status for Tier 1 pilot.
 */
export function mapEngineStateToScheduledTaskStatus(
  engineState: ProcessEngineState,
): ScheduledTaskStatus | null {
  switch (engineState) {
    case 'pending':
      return 'scheduled';
    case 'ready':
      return 'queued';
    case 'in_progress':
      return 'running';
    case 'completed':
      return 'completed';
    case 'blocked':
      return 'paused';
    case 'canceled':
      return 'cancelled';
    default:
      return null;
  }
}
