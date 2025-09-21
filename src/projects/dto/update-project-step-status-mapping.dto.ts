import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateProjectStepStatusMappingDto } from './create-project-step-status-mapping.dto';

/**
 * Update Project Step Status Mapping DTO.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a project step status mapping.
 */
export class UpdateProjectStepStatusMappingDto extends PartialType(CreateProjectStepStatusMappingDto) {
  /**
   * Mapping ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  mappingId!: number;
}