import { CustomerProjectMemberEntity } from '../entities/customer_project_member.entity';

export interface FindAllResultInterface {
  projectMembers: CustomerProjectMemberEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
