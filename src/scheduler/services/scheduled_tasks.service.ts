// src/scheduler/services/scheduled-tasks.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';

/**
 * ScheduledTasksService is responsible for managing scheduled tasks, including
 * retrieving active tasks, deactivating tasks, and creating new active tasks.
 */
@Injectable()
export class ScheduledTasksService {
  constructor(
    @InjectRepository(ScheduledTaskEntity)
    private readonly repo: Repository<ScheduledTaskEntity>, // Repository for scheduled tasks
    private readonly ds: DataSource, // DataSource for managing transactions
  ) {}

  /**
   * Retrieves the active scheduled task for a given task ID.
   * @param taskId - The ID of the task to retrieve.
   * @returns The active scheduled task entity, or null if none exists.
   */
  async getActiveByTask(taskId: number) {
    return this.repo.findOne({ where: { taskId, isActive: 1 as any } });
  }

  /**
   * Deactivates all other active scheduled tasks for a given task ID.
   * @param taskId - The ID of the task for which to deactivate other active tasks.
   */
  async deactivateOthers(taskId: number) {
    await this.repo
      .createQueryBuilder()
      .update(ScheduledTaskEntity)
      .set({ isActive: 0 as any }) // Set isActive to 0 (inactive)
      .where('task_id = :taskId AND is_active = 1', { taskId }) // Target active tasks with the given task ID
      .execute();
  }

  /**
   * Creates a new active scheduled task for a given task ID, deactivating any existing active tasks.
   * @param row - Partial data for the new scheduled task entity.
   * @returns The newly created active scheduled task entity.
   */
  async createActive(row: Partial<ScheduledTaskEntity>): Promise<ScheduledTaskEntity> {
    return this.ds.transaction(async (trx) => {
      // Deactivate any existing active tasks for the given task ID
      await trx
        .getRepository(ScheduledTaskEntity)
        .createQueryBuilder()
        .update(ScheduledTaskEntity)
        .set({ isActive: 0 as any })
        .where('task_id = :taskId AND is_active = 1', { taskId: row.taskId })
        .execute();

      // Retrieve the latest version of the task
      const prev = await trx.getRepository(ScheduledTaskEntity).find({
        where: { taskId: row.taskId! },
        select: ['version'],
        order: { version: 'DESC' as any }, // Order by descending version
        take: 1, // Limit to the most recent version
      });

      // Calculate the next version number
      const nextVersion = (prev[0]?.version ?? 0) + 1;

      // Create a new scheduled task entity with the updated version and active status
      const entity = trx.getRepository(ScheduledTaskEntity).create({
        ...row,
        version: nextVersion, // Incremented version number
        isActive: 1 as any, // Mark as active
        status: 'scheduled', // Default status
      });

      // Save the new entity and return it
      return trx.getRepository(ScheduledTaskEntity).save(entity);
    });
  }

  /**
   * Saves a scheduled task entity to the database.
   * @param row - The scheduled task entity to save.
   * @returns The saved scheduled task entity.
   */
  async save(row: ScheduledTaskEntity) {
    return this.repo.save(row);
  }
}