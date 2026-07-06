import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduledTaskHistoryDto } from './create-scheduled_task_history.dto';

export class UpdateScheduledTaskHistoryDto extends PartialType(
  CreateScheduledTaskHistoryDto,
) {}
