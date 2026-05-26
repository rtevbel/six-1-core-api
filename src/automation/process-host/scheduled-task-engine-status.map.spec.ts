import { mapEngineStateToScheduledTaskStatus } from './scheduled-task-engine-status.map';

describe('mapEngineStateToScheduledTaskStatus', () => {
  it('maps engine states to scheduler statuses', () => {
    expect(mapEngineStateToScheduledTaskStatus('pending')).toBe('scheduled');
    expect(mapEngineStateToScheduledTaskStatus('ready')).toBe('queued');
    expect(mapEngineStateToScheduledTaskStatus('in_progress')).toBe('running');
    expect(mapEngineStateToScheduledTaskStatus('completed')).toBe('completed');
    expect(mapEngineStateToScheduledTaskStatus('blocked')).toBe('paused');
    expect(mapEngineStateToScheduledTaskStatus('canceled')).toBe('cancelled');
  });
});
