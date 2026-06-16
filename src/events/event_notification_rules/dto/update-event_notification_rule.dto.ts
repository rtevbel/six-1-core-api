import { PartialType } from '@nestjs/mapped-types';
import { CreateEventNotificationRuleDto } from './create-event_notification_rule.dto';

export class UpdateEventNotificationRuleDto extends PartialType(
  CreateEventNotificationRuleDto,
) {}
