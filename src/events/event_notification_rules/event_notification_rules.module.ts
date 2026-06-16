import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventNotificationRuleEntity } from './entities/event_notification_rule.entity';
import { EventNotificationRulesService } from './event_notification_rules.service';
import { EventNotificationRulesController } from './event_notification_rules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EventNotificationRuleEntity])],
  controllers: [EventNotificationRulesController],
  providers: [EventNotificationRulesService],
  exports: [EventNotificationRulesService],
})
export class EventNotificationRulesModule {}
