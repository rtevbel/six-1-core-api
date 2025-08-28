import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateUserRoleDto } from './create-user-role.dto';

/**
 * Update UserRole DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a user-role mapping.
 */
export class UpdateUserRoleDto extends CreateUserRoleDto {
  /**
   * UserRole ID.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsNotEmpty()
  userRoleId!: number;
}
