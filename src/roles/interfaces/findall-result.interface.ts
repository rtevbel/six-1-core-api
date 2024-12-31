import { Role } from '../entities/role.entity';
export interface findAllResultInterface {
  roles: Role[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
