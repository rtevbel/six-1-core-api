import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsDate,
  IsObject,
  MaxLength,
  Matches,
  Validate,
} from 'class-validator';
import { IsProcessSubjectTypeConstraint } from '../validators/is-process-subject-type.validator';

/**
 * DTO for creating a new ProcessInstance.
 */
export class CreateProcessInstanceDto {
  /**
   * ID of the process template this instance is based on.
   */
  @IsNumber()
  processTemplateId!: number;

  /**
   * ID of the tenant this process instance belongs to.
   */
  @IsNumber()
  tenantId!: number;

  /**
   * Job anchor type (see process-subject.constants). Required on new creates once
   * subject model is enabled; optional for backward compatibility until Phase 1 facade.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/)
  @Validate(IsProcessSubjectTypeConstraint)
  subjectType?: string;

  /**
   * Primary key of the subject entity (or process_instance_id for workflow self-subject).
   */
  @IsOptional()
  @IsNumber()
  subjectId?: number;

  /**
   * Optional snapshot for hosts and runner UI.
   */
  @IsOptional()
  @IsObject()
  subjectMetadata?: Record<string, unknown>;

  /**
   * Status of the process instance.
   */
  @IsEnum(['draft', 'active', 'completed', 'canceled'])
  status!: 'draft' | 'active' | 'completed' | 'canceled';

  /**
   * ID of the tenant user who created this process instance.
   */
  @IsNumber()
  createdBy!: number;

  /**
   * Correlation ID for the process instance (optional).
   */
  @IsOptional()
  @IsString()
  correlationId?: string;

  /**
   * Date when the process instance was completed (optional).
   */
  @IsOptional()
  @IsDate()
  completedAt?: Date;

  /**
   * Date when the process instance was canceled (optional).
   */
  @IsOptional()
  @IsDate()
  canceledAt?: Date;
}
