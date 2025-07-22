import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateTenantUserInvitationDto } from './create-tenant_user_invitation.dto';

/**
 * Update tenant user invitation DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating tenant user invitations.
 */
import { PartialType } from '@nestjs/mapped-types';

export class UpdateTenantUserInvitationDto extends PartialType(
  CreateTenantUserInvitationDto,
) {
  /**
   * Invitation ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  invitationId!: number;
}
