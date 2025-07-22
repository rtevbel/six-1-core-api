import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTenantSubscriptionDto } from './create-tenant_subscription.dto';

/**
 * Update tenant subscription DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant subscription information.
 */
export class UpdateTenantSubscriptionDto extends CreateTenantSubscriptionDto {
  /**
   * Subscription ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  subscriptionId!: number;
}
