import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Create tenant team project DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a tenant team project.
 */
export class CreateTenantTeamProjectDto {
  /**
   * Tenant team ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantTeamId!: number;

  /**
   * Project ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  projectId!: number;

  /**
   * Created by user ID.
   *
   * - Optional field; stamped from the caller's tenant membership when omitted.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsOptional()
  @IsNumber()
  createdBy?: number;
}
