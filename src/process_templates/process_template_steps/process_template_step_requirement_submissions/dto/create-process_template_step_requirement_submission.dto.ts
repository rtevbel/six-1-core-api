import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsDate,
  IsJSON,
  IsDateString,
} from 'class-validator';

/**
 * DTO for creating a new ProcessTemplateStepRequirementSubmission.
 */
export class CreateProcessTemplateStepRequirementSubmissionDto {
  /**
   * ID of the associated process template step requirement.
   */
  @IsNumber()
  processTemplateStepRequirementId!: number;

  /**
   * Submitted data for the step requirement.
   */
  @IsJSON()
  submittedData!: Record<string, any>;

  /**
   * Status of the submission (default: pending).
   */
  @IsEnum(['pending', 'approved', 'rejected'])
  status!: 'pending' | 'approved' | 'rejected';

  /**
   * Tenant User ID who created this submission.
   */
  @IsNumber()
  createdBy!: number;

  /**
   * Tenant User ID who reviewed this submission (optional).
   */
  @IsOptional()
  @IsNumber()
  reviewedBy?: number;

  /**
   * Date and time when the submission was reviewed (optional).
   */
  @IsOptional()
  @IsDateString()
  reviewedAt?: Date;
}
