import { CustomerEntity } from '../entities/customer.entity';

export interface FindAllResultInterface {
  customers: CustomerEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
