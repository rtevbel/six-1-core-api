import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTenantConfigurationsDto } from './create-tenant_configuration.dto';

/**
 * Update tenant configurations DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant configurations.
 */
export class UpdateTenantConfigurationsDto extends CreateTenantConfigurationsDto {
  /**
   * Tenant configuration ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  tenantConfigId!: number;

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
