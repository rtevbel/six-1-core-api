import { PartialType } from '@nestjs/mapped-types';
import { IsNumber } from 'class-validator';
import { CreateProcessInstanceStepRequirementDto } from './create-process_instance_step_requirement.dto';

/**
 * DTO for updating an existing ProcessInstanceStepRequirement.
 */
export class UpdateProcessInstanceStepRequirementDto extends PartialType(
  CreateProcessInstanceStepRequirementDto,
) {
  /**
   * ID of the process instance step requirement to be updated.
   */
  @IsNumber()
  requirementInstanceId!: number;
}
