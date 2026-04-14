import { CustomerEntity } from '../entities/customer.entity';

export interface FindAllResultInterface {
  items: CustomerEntity[];
  customers?: CustomerEntity[];
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
