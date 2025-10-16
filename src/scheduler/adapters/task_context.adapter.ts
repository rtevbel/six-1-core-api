import { Injectable } from '@nestjs/common';
import { TaskContextProvider } from '../core/interfaces';
import { TasksService } from '../../projects/tasks/tasks.service';

/**
 * TaskContextAdapter is an implementation of the TaskContextProvider interface.
 * It provides methods to retrieve the context of a task, including the tenant ID
 * and the tenant user ID associated with the task.
 */
@Injectable()
export class TaskContextAdapter implements TaskContextProvider {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Retrieves the context of a task, including the tenant ID and the tenant user ID.
   * @param taskId - The ID of the task.
   * @returns A promise that resolves to an object containing the tenant ID and tenant user ID.
   */
  async getTaskContext(taskId: number): Promise<{ tenantId: number; tenantUserId: number | null }> {
    // Fetch the task details using the TasksService
    const task = await this.tasksService.findOneByTaskId(1, taskId);

    //TODO: Need to change with actual data 
    // Return the tenant ID and the tenant user ID (or null if not assigned)
    // return { tenantId: task., tenantUserId: task.assigneeTenantUserId ?? null };

    // Uncomment the following line for placeholder data during development
     return { tenantId: 1, tenantUserId: null }; // placeholder
  }
}