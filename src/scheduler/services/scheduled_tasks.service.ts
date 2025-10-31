import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';

/**
 * CRUD helpers for scheduled_tasks that enforce "active row" semantics.
 */
@Injectable()
export class ScheduledTasksService {
  constructor(
    @InjectRepository(ScheduledTaskEntity)
    private readonly repo: Repository<ScheduledTaskEntity>,
  ) {}

  async createActive(partial: Partial<ScheduledTaskEntity>) {
    const row = this.repo.create({
      ...partial,
      isActive: 1,
      status: 'scheduled',
      version: (partial.version ?? 0) + 1,
    } as ScheduledTaskEntity);
    return this.repo.save(row);
  }

  async deactivateAllForTask(taskId: number) {
    await this.repo.update({ taskId, isActive: 1 }, { isActive: 0 });
  }

  async loadActive(id: number) {
    return this.repo.findOne({ where: { scheduledTaskId: id, isActive: 1 } });
  }

  async markQueued(id: number, startJobId: string | null, endJobId: string | null) {
    await this.repo.update({ scheduledTaskId: id }, { status: 'queued', startJobId, endJobId });
  }

  async markRunning(id: number, when: Date) {
    await this.repo.update({ scheduledTaskId: id }, { actualStartUtc: when, status: 'running' });
  }

  async markCompleted(id: number, when: Date) {
    await this.repo.update({ scheduledTaskId: id }, { actualEndUtc: when, status: 'completed', isActive: 0 });
  }

  async pauseUntil(id: number, untilUtc: Date, reason: 'calendar'|'dependency') {
    await this.repo.update({ scheduledTaskId: id }, { blockedUntilUtc: untilUtc, blockReason: reason, status: 'paused' });
  }

  async resume(id: number) {
    await this.repo.update({ scheduledTaskId: id }, { blockedUntilUtc: null, blockReason: 'none', status: 'scheduled' });
  }

  /** Any active schedule for this user overlapping [from,to)? */
  async findUserOverlaps(tenantUserId: number, fromUtc: Date, toUtc: Date) {
    return this.repo.createQueryBuilder('s')
      .where('s.tenant_user_id = :uid', { uid: tenantUserId })
      .andWhere('s.is_active = 1')
      .andWhere('(s.effective_start_utc < :to) AND (s.effective_end_utc > :from)', { from: fromUtc, to: toUtc })
      .getMany();
  }

  /** Any active *child* schedule on this task overlapping [from,to)? */
  async findTaskChildOverlaps(taskId: number, fromUtc: Date, toUtc: Date) {
    return this.repo.createQueryBuilder('s')
      .where('s.task_id = :tid', { tid: taskId })
      .andWhere('s.tenant_user_id IS NOT NULL')
      .andWhere('s.is_active = 1')
      .andWhere('(s.effective_start_utc < :to) AND (s.effective_end_utc > :from)', { from: fromUtc, to: toUtc })
      .getMany();
  }
}
