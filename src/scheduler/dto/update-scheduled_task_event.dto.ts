import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduledTaskEventDto } from './create-scheduled_task_event.dto';

export class UpdateScheduledTaskEventDto extends PartialType(
  CreateScheduledTaskEventDto,
) {}
