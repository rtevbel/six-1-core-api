import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantTeamMemberDto } from './create-tenant_team_member.dto';

/**
 * Update tenant team member DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a tenant team member.
 */
export class UpdateTenantTeamMemberDto extends PartialType(
  CreateTenantTeamMemberDto,
) {
  /**
   * Tenant team member ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantTeamMemberId!: number;

  /**
   * Tenant user ID who updated the team member.
   *
   * - Optional field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  updatedBy?: number;
}
