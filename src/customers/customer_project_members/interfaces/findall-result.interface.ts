import { CustomerProjectMemberEntity } from '../entities/customer_project_member.entity';

/**
 * Runtime v2 list envelope (items + legacy array + top-level paging).
 */
export interface FindAllResultInterface {
  items: CustomerProjectMemberEntity[];
  projectMembers: CustomerProjectMemberEntity[];
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
