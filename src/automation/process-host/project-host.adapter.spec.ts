import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { ProjectHostAdapter } from './project-host.adapter';
import { EventsService } from '../../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { PROCESS_SUBJECT_TYPE_PROJECT } from '../process-subject.constants';

describe('ProjectHostAdapter', () => {
  let adapter: ProjectHostAdapter;
  const emit = jest.fn();
  const query = jest.fn();

  const em = { query } as unknown as EntityManager;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectHostAdapter,
        { provide: EventsService, useValue: { emit } },
      ],
    }).compile();

    adapter = module.get(ProjectHostAdapter);
  });

  it('syncs task kanban column on step state change', async () => {
    query
      .mockResolvedValueOnce([
        { task_id: 1, project_id: 10, status_control: 'process' },
      ])
      .mockResolvedValueOnce([{ task_status_id: 3 }])
      .mockResolvedValueOnce(undefined);

    await adapter.onStepStateChanged({
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 99,
      templateId: 3,
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 10,
      stepInstanceId: 5,
      engineState: 'ready',
      entityManager: em,
      advance: { actorTenantUserId: 7 },
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM tasks'),
      [5],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tasks'),
      [3, 1],
    );
    expect(emit).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.TASK_STATUS_CHANGED,
      expect.objectContaining({
        userId: 7,
        tenantId: 1,
        entity: {
          entityType: 'task',
          entityId: 1,
          objectType: 'task',
          resolutionMode: 'sor_bound',
          coreId: 1,
        },
        data: expect.objectContaining({
          objectType: 'task',
          resolutionMode: 'sor_bound',
          coreId: 1,
        }),
      }),
    );
  });

  it('marks project completed when all steps are done', async () => {
    query
      .mockResolvedValueOnce([
        { completed_count: 2, total_count: 2 },
      ])
      .mockResolvedValueOnce(undefined);

    const canComplete = await adapter.canCompleteJob({
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 99,
      templateId: 3,
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 10,
      entityManager: em,
    });

    expect(canComplete).toBe(true);
  });

  it('updates project status on process completed', async () => {
    query.mockResolvedValueOnce(undefined);

    await adapter.onProcessCompleted({
      tenantId: 1,
      createdBy: 2,
      processInstanceId: 99,
      templateId: 3,
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 10,
      entityManager: em,
      advance: { actorTenantUserId: 7, correlationId: 'corr-1' },
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE projects'),
      [10],
    );
    expect(emit).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.PROJECT_STATUS_CHANGED,
      expect.objectContaining({
        userId: 7,
        correlationId: 'corr-1',
        tenantId: 1,
        entity: {
          entityType: 'project',
          entityId: 10,
          objectType: 'project',
          resolutionMode: 'sor_bound',
          coreId: 10,
        },
      }),
    );
  });
});
