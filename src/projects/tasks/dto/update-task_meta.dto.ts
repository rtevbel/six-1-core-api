import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskMetaDto } from './create-task_meta.dto';

export class UpdateTaskMetaDto extends PartialType(CreateTaskMetaDto) {}
