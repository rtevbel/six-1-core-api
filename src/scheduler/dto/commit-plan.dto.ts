import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

/**
 * Commit Plan DTO class.
 *
 * @description Data transfer object for committing a project plan.
 */
export class CommitPlanDto {
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
   * Plan ID (schedule scenario id).
   *
   * - Required field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  @Type(() => Number)
  planId!: number;
}
