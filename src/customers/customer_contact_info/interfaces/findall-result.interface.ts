import { CustomerContactInfoEntity } from '../entities/customer_contact_info.entity';

/**
 * Runtime v2 list envelope (items + legacy array + top-level paging).
 */
export interface FindAllResultInterface {
  items: CustomerContactInfoEntity[];
  contactInfoRecords: CustomerContactInfoEntity[];
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
