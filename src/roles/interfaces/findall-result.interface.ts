import { RoleEntity } from '../entities/role.entity';
export interface findAllResultInterface {
  roles: RoleEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
