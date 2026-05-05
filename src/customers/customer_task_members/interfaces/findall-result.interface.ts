import { CustomerTaskMemberEntity } from '../entities/customer_task_member.entity';

/**
 * Runtime v2 list envelope (items + legacy array + top-level paging).
 */
export interface FindAllResultInterface {
  items: CustomerTaskMemberEntity[];
  taskMembers: CustomerTaskMemberEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
