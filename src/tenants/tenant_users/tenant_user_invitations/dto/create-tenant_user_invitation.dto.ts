import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { IsTodayOrLater } from '../../../../common/validators/is-today-or-later.validator';

/**
 * Create tenant user invitation DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating tenant user invitations.
 */
export class CreateTenantUserInvitationDto {
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
   * User ID.
   *
   * - Optional for brand-new email invites.
   * - Must be a number when provided.
   *
   * @type {number | null}
   */
  @IsNumber()
  @IsOptional()
  userId?: number | null;

  /**
   * Email of the invited user.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  email!: string;

  /**
   * Invitation token.
   *
   * - Optional: the service mints one when omitted.
   * - Must be a string when provided.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  token?: string;

  /**
   * Role ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  roleId!: number;

  /**
   * Status of the invitation.
   *
   * - Optional field.
   * - Must be one of 'pending', 'accepted', or 'declined'.
   *
   * @type {'pending' | 'accepted' | 'declined'}
   */
  @IsEnum(['pending', 'accepted', 'declined'])
  @IsOptional()
  status?: 'pending' | 'accepted' | 'declined';

  /**
   * Tenant user ID of the inviter (`tenant_users.tenant_user_id`).
   *
   * - Optional: the service uses the authenticated actor's membership when omitted.
   *
   * @type {number}
   */
  @IsNumber()
  @IsOptional()
  invitedBy?: number;

  /**
   * Expiration date of the invitation.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsDateString()
  @IsOptional()
  @IsTodayOrLater({ message: 'Expiration date must be today or later.' })
  expiresAt?: string;
}
