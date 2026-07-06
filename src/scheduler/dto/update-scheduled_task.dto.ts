import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduledTaskDto } from './create-scheduled_task.dto';

export class UpdateScheduledTaskDto extends PartialType(CreateScheduledTaskDto) {}
