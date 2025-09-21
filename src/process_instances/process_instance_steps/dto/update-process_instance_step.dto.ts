import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessInstanceStepDto } from './create-process_instance_step.dto';
import {IsNumber}  from "class-validator";

/**
 * DTO for updating an existing ProcessInstanceStep.
 */
export class UpdateProcessInstanceStepDto extends PartialType(CreateProcessInstanceStepDto) {
  /**
   * ID of the process instance step to be updated.
   */
  @IsNumber()
  stepInstanceId!: number;
}