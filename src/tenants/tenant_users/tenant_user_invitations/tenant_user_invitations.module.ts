import { Module, forwardRef } from '@nestjs/common';
import { TenantUserInvitationsService } from './tenant_user_invitations.service';
import { TenantUserInvitationsController } from './tenant_user_invitations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserInvitationsEntity } from './entities/tenant_user_invitation.entity';
import { NotificationsModule } from '../../../notifications/notifications.module';
import { TenantUsersEntity } from '../entities/tenant_user.entity';
import { TenantUserRoleEntity } from '../tenant_user_roles/entities/tenant_user_role.entity';
import { UserEntity } from '../../../users/entities/user.entity';

/**
 * TenantUserInvitationsModule is responsible for managing tenant user invitations.
 * It includes the controller and service for handling operations related to tenant user invitations
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantUserInvitationsEntity,
      TenantUsersEntity,
      TenantUserRoleEntity,
      UserEntity,
    ]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [TenantUserInvitationsController],
  providers: [TenantUserInvitationsService],
})
export class TenantUserInvitationsModule {}
