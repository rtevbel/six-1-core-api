import { IsInt } from 'class-validator';

/**
 * Commit Plan DTO class.
 *
 * @description Data transfer object for committing a project plan.
 */
export class CommitPlanDto {
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
   * Plan ID.
   *
   * - Required field.
   * - Must be an integer.
   *
   * @type {number}
   */
  @IsInt()
  planId!: number;
}