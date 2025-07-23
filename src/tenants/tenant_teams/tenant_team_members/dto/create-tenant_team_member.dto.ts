import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Create tenant team member DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a tenant team member.
 */
export class CreateTenantTeamMemberDto {
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
   * Tenant user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserId!: number;

  /**
   * Role ID.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  roleId?: number;
}
