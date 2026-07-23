import { Transform } from 'class-transformer';
import { IsObject, IsOptional, ValidateIf } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateEventNotificationRuleDto } from './create-event_notification_rule.dto';

export class UpdateEventNotificationRuleDto extends PartialType(
  CreateEventNotificationRuleDto,
) {
  /**
   * Redeclared so empty-string → null survives PartialType metadata inheritance.
   */
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsObject()
  filterJson?: Record<string, unknown> | null;
}
