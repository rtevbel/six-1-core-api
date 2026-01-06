import { CustomerInvitationEntity } from '../entities/customer_invitation.entity';

export interface FindAllResultInterface {
  invitations: CustomerInvitationEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
