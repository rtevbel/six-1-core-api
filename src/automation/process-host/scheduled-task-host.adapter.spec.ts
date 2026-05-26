import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledTaskHostAdapter } from './scheduled-task-host.adapter';
import { PROCESS_SUBJECT_TYPE_SCHEDULED_TASK } from '../process-subject.constants';

describe('ScheduledTaskHostAdapter', () => {
  let adapter: ScheduledTaskHostAdapter;
  const query = jest.fn().mockResolvedValue([]);

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduledTaskHostAdapter],
    }).compile();
    adapter = module.get(ScheduledTaskHostAdapter);
  });

  it('links process on start', async () => {
    await adapter.onProcessStarted({
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 99,
      templateId: 3,
      subjectType: PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
      subjectId: 50,
      entityManager: { query } as never,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE scheduled_tasks'),
      [99, 50, 1],
    );
  });

  it('syncs running on in_progress step change', async () => {
    await adapter.onStepStateChanged({
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 99,
      templateId: 3,
      subjectType: PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
      subjectId: 50,
      stepInstanceId: 10,
      engineState: 'in_progress',
      entityManager: { query } as never,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = ?"),
      expect.arrayContaining(['running', 50, 1]),
    );
  });

  it('canCompleteJob when all steps completed', async () => {
    query.mockResolvedValueOnce([{ completed_count: 2, total_count: 2 }]);

    const ok = await adapter.canCompleteJob({
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 99,
      templateId: 3,
      subjectType: PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
      subjectId: 50,
      entityManager: { query } as never,
    });

    expect(ok).toBe(true);
  });
});
