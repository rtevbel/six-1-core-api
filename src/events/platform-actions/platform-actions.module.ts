import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformActionEntity } from './entities/platform_action.entity';
import { ActionBindingEntity } from './entities/action_binding.entity';
import { ActionExecutionLogEntity } from './entities/action_execution_log.entity';
import { PlatformActionsService } from './platform_actions.service';
import { ActionBindingsService } from './action_bindings.service';
import {
  ActionBindingEngineService,
  ActionExecutorService,
} from './action-executor.service';
import { PlatformActionsController } from './platform_actions.controller';
import { ActionBindingsController } from './action_bindings.controller';
import { NotificationRulesModule } from '../notification-rules/notification-rules.module';
import { NotificationChannelsModule } from '../../notifications/notification_channels/notification_channels.module';
import { NotificationTemplatesModule } from '../../notifications/notification_templates/notification_templates.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformActionEntity,
      ActionBindingEntity,
      ActionExecutionLogEntity,
    ]),
    NotificationRulesModule,
    forwardRef(() => NotificationChannelsModule),
    forwardRef(() => NotificationTemplatesModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [PlatformActionsController, ActionBindingsController],
  providers: [
    PlatformActionsService,
    ActionBindingsService,
    ActionExecutorService,
    ActionBindingEngineService,
  ],
  exports: [
    PlatformActionsService,
    ActionBindingsService,
    ActionExecutorService,
    ActionBindingEngineService,
  ],
})
export class PlatformActionsModule {}
