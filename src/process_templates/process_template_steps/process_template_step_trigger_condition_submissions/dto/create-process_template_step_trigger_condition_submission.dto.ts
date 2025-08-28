import { IsNumber, IsObject, IsEnum, IsOptional, IsDateString } from 'class-validator';

/**
 * DTO for creating a new ProcessTemplateStepTriggerConditionSubmission.
 */
export class CreateProcessTemplateStepTriggerConditionSubmissionDto {
  /**
   * ID of the associated step trigger condition.
   */
  @IsNumber()
  stepTriggerConditionId!: number;

  /**
   * Submitted data for the trigger condition.
   */
  @IsObject()
  submittedData!: object;

  /**
   * Status of the submission (default: pending).
   */
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

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