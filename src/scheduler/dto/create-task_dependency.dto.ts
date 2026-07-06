import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import type { DependencyType } from '../entities/task_dependency.entity';

export class CreateTaskDependencyDto {
  @IsNumber()
  @IsNotEmpty()
  taskId!: number;

  @IsNumber()
  @IsNotEmpty()
  dependsOnTaskId!: number;

  @IsEnum(['FS', 'SS', 'FF', 'SF'])
  @IsOptional()
  dependencyType?: DependencyType;
}
