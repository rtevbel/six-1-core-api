import { CustomerInvitationEntity } from '../entities/customer_invitation.entity';

/**
 * Runtime v2 list envelope (items + legacy array + top-level paging).
 */
export interface FindAllResultInterface {
  items: CustomerInvitationEntity[];
  invitations: CustomerInvitationEntity[];
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
