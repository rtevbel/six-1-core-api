import { CustomerTaskMemberEntity } from '../entities/customer_task_member.entity';

export interface FindAllResultInterface {
  taskMembers: CustomerTaskMemberEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
