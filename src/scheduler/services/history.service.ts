import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledTaskHistoryEntity } from '../entities/scheduled_task_history.entity';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';

/**
 * HistoryService is responsible for managing the history of scheduled tasks.
 * It creates snapshots of task data for auditing or tracking changes over time.
 */
@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(ScheduledTaskHistoryEntity)
    private readonly repo: Repository<ScheduledTaskHistoryEntity>, // Repository for task history
  ) {}

  /**
   * Creates a snapshot of the current state of a scheduled task and saves it to the history table.
   * @param row - The scheduled task entity to snapshot.
   */
  async snapshot(row: ScheduledTaskEntity) {
    // Create a new history record with the current state of the scheduled task
    const snap = this.repo.create({
      scheduledTaskId: row.scheduledTaskId, // ID of the scheduled task
      version: row.version, // Version of the task
      snapshot: {
        tenantId: row.tenantId, // Tenant ID associated with the task
        tenantUserId: row.tenantUserId, // Tenant user ID associated with the task
        taskId: row.taskId, // Task ID
        taskStatusId: row.taskStatusId, // Current status ID of the task
        requestedStartUtc: row.requestedStartUtc, // Requested start time (UTC)
        requestedEndUtc: row.requestedEndUtc, // Requested end time (UTC)
        effectiveStartUtc: row.effectiveStartUtc, // Effective start time (UTC)
        effectiveEndUtc: row.effectiveEndUtc, // Effective end time (UTC)
        tzUsed: row.tzUsed, // Timezone used for scheduling
        dependencyGateUtc: row.dependencyGateUtc, // Dependency gate time (UTC)
        blockedUntilUtc: row.blockedUntilUtc, // Time until the task is blocked (UTC)
        blockReason: row.blockReason, // Reason for the task being blocked
        status: row.status, // Current status of the task
        priority: row.priority, // Priority of the task
        calendarSnapshot: row.calendarSnapshot, // Snapshot of the calendar data
        dependencySnapshot: row.dependencySnapshot, // Snapshot of the dependency data
      },
    });

    // Save the snapshot to the history repository
    await this.repo.save(snap);
  }
}
