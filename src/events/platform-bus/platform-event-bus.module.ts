import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformEventRecordEntity } from './entities/platform_event_record.entity';
import { PlatformEventBusService } from './platform-event-bus.service';
import { PLATFORM_EVENT_CONSUMERS } from './interfaces/platform-event-consumer.interface';
import {
  AutomationEventConsumer,
  NotificationRuleConsumer,
  ActionBindingConsumer,
  ProcessStartRuleConsumer,
  PlatformEventNotificationBridgeConsumer,
} from './consumers/platform-event-consumers';
import { PlatformEventNotificationBridgeService } from '../platform-event-notification-bridge.service';
import { EventLogsModule } from '../event_logs/event_logs.module';
import { AutomationModule } from '../../automation/automation.module';

import { NotificationRulesModule } from '../notification-rules/notification-rules.module';
import { PlatformActionsModule } from '../platform-actions/platform-actions.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { ActionExecutionLogEntity } from '../platform-actions/entities/action_execution_log.entity';
import { EventLogEntity } from '../event_logs/entities/event_log.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { NotificationLogEntity } from '../../notifications/notification_logs/entities/notification_log.entity';
import { PlatformEventRecordsService } from './platform-event-records.service';
import { PlatformEventTimelineService } from './platform-event-timeline.service';
import { PlatformEventAuditController } from './platform-event-audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformEventRecordEntity,
      ActionExecutionLogEntity,
      EventLogEntity,
      NotificationEntity,
      NotificationLogEntity,
    ]),
    forwardRef(() => EventLogsModule),
    forwardRef(() => AutomationModule),
    NotificationRulesModule,
    forwardRef(() => PlatformActionsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [PlatformEventAuditController],
  providers: [
    PlatformEventNotificationBridgeService,
    PlatformEventRecordsService,
    PlatformEventTimelineService,
    AutomationEventConsumer,
    NotificationRuleConsumer,
    ActionBindingConsumer,
    ProcessStartRuleConsumer,
    PlatformEventNotificationBridgeConsumer,
    {
      provide: PLATFORM_EVENT_CONSUMERS,
      useFactory: (
        automation: AutomationEventConsumer,
        notificationRules: NotificationRuleConsumer,
        actionBindings: ActionBindingConsumer,
        processStartRules: ProcessStartRuleConsumer,
        notificationBridge: PlatformEventNotificationBridgeConsumer,
      ) => [
        automation,
        notificationRules,
        actionBindings,
        processStartRules,
        notificationBridge,
      ],
      inject: [
        AutomationEventConsumer,
        NotificationRuleConsumer,
        ActionBindingConsumer,
        ProcessStartRuleConsumer,
        PlatformEventNotificationBridgeConsumer,
      ],
    },
    PlatformEventBusService,
  ],
  exports: [
    PlatformEventBusService,
    PlatformEventNotificationBridgeService,
    PlatformEventRecordsService,
    PlatformEventTimelineService,
  ],
})
export class PlatformEventBusModule {}
