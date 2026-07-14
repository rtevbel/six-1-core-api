import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Create system status DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a system status.
 */
export class CreateSystemStatusDto {
  /**
   * Human-readable status name.
   *
   * - Required field.
   * - Must be a string.
   * - Must be unique.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  name!: string;

  /**
   * Module name associated with the status.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  moduleName!: string;

  /**
   * Module identifier associated with the status.
   *
   * - Required field.
   * - Must be a string.
   *
   * @type {string}
   */
  @IsNotEmpty()
  @IsString()
  moduleIdentifier!: string;
}
