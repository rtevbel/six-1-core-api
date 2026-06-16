import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationRuleEngineService } from './notification-rule-engine.service';
import { NotificationRecipientResolverService } from './notification-recipient-resolver.service';
import { TenantRecipientLookupService } from './tenant-recipient-lookup.service';
import { NotificationDispatchDedupService } from './notification-dispatch-dedup.service';
import { EventNotificationRulesModule } from '../event_notification_rules/event_notification_rules.module';
import { EventLogsModule } from '../event_logs/event_logs.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { TenantUserRoleEntity } from '../../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { RoleDescriptionEntity } from '../../roles/entities/role-description.entity';
import { PermissionDescriptionEntity } from '../../permissions/entities/permission_description.entity';
import { EventLogEntity } from '../event_logs/entities/event_log.entity';

@Module({
  imports: [
    EventNotificationRulesModule,
    forwardRef(() => EventLogsModule),
    forwardRef(() => NotificationsModule),
    TypeOrmModule.forFeature([
      TenantUsersEntity,
      TenantUserRoleEntity,
      RoleDescriptionEntity,
      PermissionDescriptionEntity,
      EventLogEntity,
    ]),
  ],
  providers: [
    NotificationRuleEngineService,
    NotificationRecipientResolverService,
    TenantRecipientLookupService,
    NotificationDispatchDedupService,
  ],
  exports: [
    NotificationRuleEngineService,
    NotificationRecipientResolverService,
    TenantRecipientLookupService,
    NotificationDispatchDedupService,
  ],
})
export class NotificationRulesModule {}
