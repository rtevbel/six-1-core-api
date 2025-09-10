import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import {CreateTenantTeamProjectDto} from "./create-tenant_team_project.dto";


/**
 * Update tenant team project DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a tenant team project.
 */
import { PartialType } from '@nestjs/mapped-types';

export class UpdateTenantTeamProjectDto extends PartialType(
  CreateTenantTeamProjectDto,
) {
  /**
   * Tenant team project ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  teamProjectId!: number;

}