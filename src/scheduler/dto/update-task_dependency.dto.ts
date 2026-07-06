import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDependencyDto } from './create-task_dependency.dto';

export class UpdateTaskDependencyDto extends PartialType(CreateTaskDependencyDto) {}
