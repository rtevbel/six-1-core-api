import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { NO_RECORD_FOUND_MESSAGE } from '../../common/constants';
import { TaskSchedulingContext } from '../core/interfaces';

/**
 * TaskContextAdapter
 * - Resolves tenant/project, assignee/team, and scheduling constraint fields from task row.
 */
@Injectable()
export class TaskContextAdapter {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
  ) {}

  async getTaskContext(taskId: number): Promise<TaskSchedulingContext> {
    const t = await this.taskRepo.findOne({ where: { taskId } });
    if (!t) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskEntity.name),
      );
    }

    return {
      tenantId: t.tenantId,
      projectId: t.projectId,
      taskStatusId: t.taskStatusId,
      assigneeId: t.primaryAssigneeId ?? null,
      teamId: t.teamId ?? null,
      startConstraintType: t.startConstraintType ?? null,
      startConstraintUtc: t.startConstraintUtc ?? null,
      finishConstraintUtc: t.finishConstraintUtc ?? null,
      estimatedDuration:
        t.estimatedDuration != null ? Number(t.estimatedDuration) : null,
      effortHours: t.effortHours != null ? Number(t.effortHours) : null,
      schedulingMode: t.schedulingMode ?? 'manual',
      defaultShiftHours:
        t.defaultShiftHours != null ? Number(t.defaultShiftHours) : null,
    };
  }
}

export { TaskContextAdapter as TaskContextProvider };
