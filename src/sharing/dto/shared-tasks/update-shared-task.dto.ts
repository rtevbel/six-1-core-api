import { PartialType } from '@nestjs/mapped-types';
import { CreateSharedTaskDto } from './create-shared-task.dto';

export class UpdateSharedTaskDto extends PartialType(CreateSharedTaskDto) {}
