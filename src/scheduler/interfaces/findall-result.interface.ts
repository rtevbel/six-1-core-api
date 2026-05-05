import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import type { RuntimeV2ListPagination } from '../../common/runtime-v2-list-pagination';

export interface FindAllResultInterface {
  items: ScheduledTaskEntity[];
  scheduledTaskRecords: ScheduledTaskEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}
