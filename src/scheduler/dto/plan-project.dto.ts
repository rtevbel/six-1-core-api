import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional } from 'class-validator';

/**
 * Plan Project DTO class.
 *
 * @description Data transfer object for planning a project.
 */
export class PlanProjectDto {
  /**
   * Tenant ID.
   *
   * - Required field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  /**
   * Project ID.
   *
   * - Required field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  @Type(() => Number)
  projectId!: number;

  /**
   * Horizon Days.
   *
   * - Optional field.
   * - Must be a number.
   * - Represents the planning horizon in days.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  horizonDays?: number;
}
