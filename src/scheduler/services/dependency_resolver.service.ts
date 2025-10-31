import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DateTime } from 'luxon';
import { TaskDependencyEntity } from '../entities/task_dependency.entity';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';

/**
 * Computes the earliest time a successor is allowed to START,
 * given its predecessors and their schedules.
 *
 * Rule of thumb (conservative):
 *  - FS: successor.start >= predecessor.finish
 *  - SS: successor.start >= predecessor.start
 *  - FF: successor.start >= predecessor.finish  (conservative; you can refine if you know successor duration)
 *  - SF: successor.start >= predecessor.finish  (conservative)
 */
@Injectable()
export class DependencyResolverService {
  constructor(
    @InjectRepository(TaskDependencyEntity)
    private readonly depRepo: Repository<TaskDependencyEntity>,
    @InjectRepository(ScheduledTaskEntity)
    private readonly schedRepo: Repository<ScheduledTaskEntity>,
  ) {}

  async earliestGateUtc(taskId: number): Promise<Date | null> {
    const deps = await this.depRepo.find({ where: { taskId } });
    if (!deps.length) return null;

    const predecessorIds = Array.from(new Set(deps.map(d => d.dependsOnTaskId)));
    const scheds = await this.schedRepo.find({
      where: { taskId: In(predecessorIds), isActive: 1 },
    });

    // Reduce to a single "start" and "finish" per predecessor (prefer actuals, else effective)
    const byTask = new Map<number, { start?: Date; end?: Date }>();
    for (const s of scheds) {
      // skip parent rows (no assignee) if you want children only:
      const start = s.actualStartUtc ?? s.effectiveStartUtc;
      const end   = s.actualEndUtc   ?? s.effectiveEndUtc;
      const cur = byTask.get(s.taskId) ?? {};
      cur.start = cur.start && cur.start < start ? cur.start : start;
      cur.end   = cur.end   && cur.end > end   ? cur.end   : end;
      byTask.set(s.taskId, cur);
    }

    let gate: DateTime | null = null;

    for (const d of deps) {
      const pred = byTask.get(d.dependsOnTaskId);
      if (!pred) continue; // predecessor not scheduled yet -> no gating data
      const predStart = pred.start ? DateTime.fromJSDate(pred.start) : null;
      const predEnd   = pred.end   ? DateTime.fromJSDate(pred.end)   : null;

      let thisGate: DateTime | null = null;
      switch (d.dependencyType) {
        case 'FS': thisGate = predEnd; break;
        case 'SS': thisGate = predStart; break;
        case 'FF': thisGate = predEnd; break;  // conservative
        case 'SF': thisGate = predEnd; break;  // conservative
      }
      if (!thisGate) continue;

      gate = gate ? DateTime.max(gate, thisGate) : thisGate;
    }

    return gate?.toJSDate() ?? null;
  }
}
