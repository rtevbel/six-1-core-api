import { IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantTeamDto } from './create-tenant_team.dto';

/**
 * Update tenant team DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a tenant team.
 */
export class UpdateTenantTeamDto extends PartialType(CreateTenantTeamDto) {
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
   * Tenant-user ID who updated the team.
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