import { Permission } from '../entities/permission.entity';
export interface findAllResultInterface {
  permissions: Permission[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
