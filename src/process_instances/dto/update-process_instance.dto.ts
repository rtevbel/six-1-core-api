import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessInstanceDto } from './create-process_instance.dto';
import { IsNumber } from 'class-validator';

/**
 * DTO for updating an existing ProcessInstance.
 * Extends CreateProcessInstanceDto with optional fields.
 */
export class UpdateProcessInstanceDto extends PartialType(CreateProcessInstanceDto) {
  /**
   * ID of the process instance to be updated.
   */
  @IsNumber()
  processInstanceId!: number;
}