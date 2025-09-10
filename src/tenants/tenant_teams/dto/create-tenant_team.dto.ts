import { IsString, IsOptional, IsNumber, IsNotEmpty , MaxLength } from 'class-validator';


/**
 * Create tenant team DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a tenant team.
 */
export class CreateTenantTeamDto {
  /**
   * Tenant ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  /**
   * Team identifier used to view team details publicly.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsOptional()
  @IsString()
  teamIdentifier!: string;

  /**
   * Name of the team.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * Description of the team.
   *
   * - Optional field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @MaxLength(65536)
  description?: string;

  /**
   * Tenant-user ID who created the team.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;
}
