import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsDate,
} from 'class-validator';

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
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  userId!: number;

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
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  token!: string;

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
   * User ID of the inviter.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  invitedBy!: number;

  /**
   * Expiration date of the invitation.
   *
   * - Optional field.
   * - Must be a valid date.
   *
   * @type {Date}
   */
  @IsDate()
  @IsOptional()
  expiresAt?: Date;
}
