import { CustomerContactInfoEntity } from '../entities/customer_contact_info.entity';

export interface FindAllResultInterface {
  contactInfoRecords: CustomerContactInfoEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
