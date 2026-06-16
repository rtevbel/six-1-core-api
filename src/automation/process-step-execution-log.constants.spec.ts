import {
  mapEngineStateToExecutionEvent,
  PROCESS_STEP_EXECUTION_EVENTS,
} from '../process_instances/process-step-execution-log.constants';

describe('process-step-execution-log.constants', () => {
  it('maps engine states to execution events', () => {
    expect(mapEngineStateToExecutionEvent('ready')).toBe('step_ready');
    expect(mapEngineStateToExecutionEvent('in_progress')).toBe('step_started');
    expect(mapEngineStateToExecutionEvent('completed')).toBe('step_completed');
    expect(mapEngineStateToExecutionEvent('canceled')).toBe('step_canceled');
    expect(mapEngineStateToExecutionEvent('blocked')).toBe('step_blocked');
    expect(mapEngineStateToExecutionEvent('skipped')).toBe('step_skipped');
    expect(mapEngineStateToExecutionEvent('failed')).toBe('step_failed');
    expect(mapEngineStateToExecutionEvent('pending')).toBeNull();
  });

  it('defines the supported execution event kinds', () => {
    expect(PROCESS_STEP_EXECUTION_EVENTS).toEqual([
      'step_ready',
      'step_started',
      'step_completed',
      'step_canceled',
      'step_blocked',
      'step_skipped',
      'step_failed',
      'step_retry',
      'step_rollback',
    ]);
  });
});
