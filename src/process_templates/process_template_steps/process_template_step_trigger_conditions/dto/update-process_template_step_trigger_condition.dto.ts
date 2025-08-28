import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessTemplateStepTriggerConditionDto } from './create-process_template_step_trigger_condition.dto';
import { IsNumber } from 'class-validator';

/**
 * DTO for updating an existing ProcessTemplateStepTriggerCondition.
 */
export class UpdateProcessTemplateStepTriggerConditionDto extends PartialType(
  CreateProcessTemplateStepTriggerConditionDto,
) {
  /**
   * ID of the process template step trigger condition to be updated.
   */
  @IsNumber()
  stepTriggerConditionId!: number;
}