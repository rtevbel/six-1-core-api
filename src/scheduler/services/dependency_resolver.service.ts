// src/scheduler/services/dependency-resolver.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DateTime } from 'luxon';
import { TaskDependencyEntity, DependencyType } from '../entities/task_dependency.entity';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';

/**
 * DependencyResolverService is responsible for resolving task dependencies
 * and computing constraints such as the earliest start and finish times for a task.
 */
@Injectable()
export class DependencyResolverService {
  constructor(
    @InjectRepository(TaskDependencyEntity)
    private readonly depRepo: Repository<TaskDependencyEntity>, // Repository for task dependencies
    @InjectRepository(ScheduledTaskEntity)
    private readonly schedRepo: Repository<ScheduledTaskEntity>, // Repository for scheduled tasks
  ) {}

  /**
   * Computes the constraints for a given task based on its dependencies.
   * It calculates the earliest possible start and finish times for the task.
   * @param taskId - The ID of the task for which constraints are computed.
   * @returns A promise that resolves to an object containing the earliest start time,
   * earliest finish time, and a snapshot of the dependency data.
   */
  async computeConstraints(taskId: number): Promise<{ earliestStartUtc?: Date; earliestFinishUtc?: Date; snapshot: any }> {
    // Fetch all dependencies for the given task
    const deps = await this.depRepo.find({ where: { taskId } });
    if (!deps.length) return { snapshot: [] }; // Return an empty snapshot if no dependencies exist

    // Extract the IDs of tasks this task depends on
    const ids = deps.map(d => d.dependsOnTaskId);

    // Fetch the linked tasks that are active
    const linked = await this.schedRepo.find({ where: { taskId: In(ids), isActive: 1 as any } });

    // Arrays to store candidate start and finish times
    const startCand: DateTime[] = [];
    const finishCand: DateTime[] = [];
    const snap: any[] = []; // Snapshot of dependency data

    // Iterate through each dependency and process its constraints
    for (const d of deps) {
      const base = linked.find(l => l.taskId === d.dependsOnTaskId);
      if (!base) continue; // Skip if the linked task is not found

      // Determine the start and end times of the dependency
      const depStart = base.actualStartUtc ?? base.effectiveStartUtc;
      const depEnd = base.actualEndUtc ?? base.effectiveEndUtc;

      // Add the dependency details to the snapshot
      snap.push({
        dependsOnTaskId: d.dependsOnTaskId,
        type: d.dependencyType,
        start: depStart,
        end: depEnd,
      });

      // Process the dependency type and add to the appropriate candidate list
      switch (d.dependencyType as DependencyType) {
        case 'FS': // Finish-to-Start
          if (depEnd) finishCand.push(DateTime.fromJSDate(depEnd, { zone: 'utc' }));
          break;
        case 'SS': // Start-to-Start
          if (depStart) startCand.push(DateTime.fromJSDate(depStart, { zone: 'utc' }));
          break;
        case 'FF': // Finish-to-Finish
          if (depEnd) finishCand.push(DateTime.fromJSDate(depEnd, { zone: 'utc' }));
          break;
        case 'SF': // Start-to-Finish
          if (depStart) finishCand.push(DateTime.fromJSDate(depStart, { zone: 'utc' }));
          break;
      }
    }

    // Calculate the earliest start and finish times based on the candidates
    const earliestStartUtc = startCand.length > 0 ? DateTime.max(...startCand).toJSDate() : undefined;
    const earliestFinishUtc = finishCand.length > 0 ? DateTime.max(...finishCand).toJSDate() : undefined;

    // Return the computed constraints and the snapshot
    return { earliestStartUtc, earliestFinishUtc, snapshot: snap };
  }
}