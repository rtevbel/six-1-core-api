import { IsInt, IsNumber, IsOptional } from 'class-validator';

/**
 * Plan Project DTO class.
 *
 * @description Data transfer object for planning a project.
 */
export class PlanProjectDto {
  /**
   * Project ID.
   *
   * - Required field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
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
  horizonDays?: number;
}
