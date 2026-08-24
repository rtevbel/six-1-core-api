import { Module, forwardRef } from '@nestjs/common';
import { TenantUsersService } from './tenant_users.service';
import { TenantUsersController } from './tenant_users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUsersEntity } from './entities/tenant_user.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

import { TenantUserInvitationsModule } from './tenant_user_invitations/tenant_user_invitations.module';
import { TenantUserConfigurationsModule } from './tenant_user_configurations/tenant_user_configurations.module';
import { TenantUserWorkingHoursModule } from './tenant_user_working_hours/tenant_user_working_hours.module';
import { TenantUserOffDaysModule } from './tenant_user_off_days/tenant_user_off_days.module';
import { TenantUserMetaModule } from './tenant_user_meta/tenant_user_meta.module';
import { TenantUserRolesModule } from './tenant_user_roles/tenant_user_roles.module';

/**
 * TenantUsersModule is responsible for managing tenant users.
 * It includes the controller and service for handling operations related to tenant users
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUsersEntity]),
    forwardRef(() => ConfigObjectsModule),
    forwardRef(() => TenantUserInvitationsModule),
    TenantUserConfigurationsModule,
    TenantUserWorkingHoursModule,
    TenantUserOffDaysModule,
    TenantUserMetaModule,
    TenantUserRolesModule,
  ],
  controllers: [TenantUsersController],
  providers: [TenantUsersService],
})
export class TenantUsersModule {}
