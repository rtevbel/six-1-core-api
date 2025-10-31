import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';

export interface FindAllResultInterface {
  scheduledTaskRecords: ScheduledTaskEntity[];
  pagination: { total: number; page: number; limit: number };
}


