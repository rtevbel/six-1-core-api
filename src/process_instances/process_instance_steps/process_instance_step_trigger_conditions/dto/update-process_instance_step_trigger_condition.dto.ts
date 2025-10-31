import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessInstanceStepTriggerDto } from './create-process_instance_step_trigger_condition.dto';
import { IsNumber } from 'class-validator';

/**
 * DTO for updating an existing ProcessInstanceStepTrigger.
 */
export class UpdateProcessInstanceStepTriggerDto extends PartialType(
  CreateProcessInstanceStepTriggerDto,
) {
  /**
   * ID of the process instance step trigger to be updated.
   */
  @IsNumber()
  triggerInstanceId!: number;
}
