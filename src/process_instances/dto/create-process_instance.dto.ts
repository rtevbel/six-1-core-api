import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsDate,
} from 'class-validator';

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
