import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';

/**
 * TaskContextAdapter
 * - Resolves tenantId/projectId and (optionally) scheduling constraints from task row.
 */
@Injectable()
export class TaskContextAdapter {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
  ) {}

  async getTaskContext(taskId: number): Promise<{
    tenantId: number;
    projectId: number;
    taskStatusId: number;
    assigneeId: number | null;
    startConstraintType?: 'ASAP'|'NoEarlierThan'|'On'|'NoLaterThan'|'MustStartOn'|'MustFinishOn'|null;
    startConstraintUtc?: Date|null;
    finishConstraintUtc?: Date|null;
  }> {
    const t = await this.taskRepo.findOne({ where: { taskId } });
    if (!t) throw new Error(`Task ${taskId} not found`);

    return {
      tenantId: t.tenantId,
      projectId: t.projectId,
      taskStatusId: t.taskStatusId,
      assigneeId: t.primaryAssigneeId ?? null,
      startConstraintType: (t as any).startConstraintType ?? null,
      startConstraintUtc:  (t as any).startConstraintUtc ?? null,
      finishConstraintUtc: (t as any).finishConstraintUtc ?? null,
    };
  }
}

export { TaskContextAdapter as TaskContextProvider }; // satisfies TASK_CONTEXT_PROVIDER token
