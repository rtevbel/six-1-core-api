import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTenantUserConfigurationDto } from './create-tenant_user_configuration.dto';
import { PartialType } from '@nestjs/mapped-types';


/**
 * Update tenant user configuration DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant user configurations.
 */
export class UpdateTenantUserConfigurationDto extends PartialType(CreateTenantUserConfigurationDto) {
  /**
   * Tenant user configuration ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantUserConfigId!: number;

  /**
   * Updated by user ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  updatedBy!: number;
}
