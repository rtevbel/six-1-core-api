import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsJSON,
  IsObject,
} from 'class-validator';

/**
 * DTO for creating a new ProcessInstanceStepRequirementSubmission.
 */
export class CreateProcessInstanceStepRequirementSubmissionDto {
  /**
   * ID of the associated process instance step requirement.
   */
  @IsNumber()
  requirementInstanceId!: number;

  /**
   * Submitted data for the step requirement.
   * This should be a JSON object.
   */
  @IsObject()
  submittedData!: Record<string, any>;

  /**
   * Indicates if the submission is valid (optional).
   */
  @IsOptional()
  @IsEnum([true, false])
  isValid?: boolean;

  /**
   * Validation errors, if any (optional).
   */
  @IsOptional()
  @IsJSON()
  validationErrors?: Record<string, any>;

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
