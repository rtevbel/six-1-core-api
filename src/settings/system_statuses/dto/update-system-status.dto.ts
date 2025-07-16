import { IsNotEmpty, IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemStatusDto } from '../dto/create-system-status.dto';

/**
 * Update system status DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for updating a system status.
 */
export class UpdateSystemStatusDto extends PartialType(CreateSystemStatusDto) {
  /**
   * The ID of the status.
   *
   * - Required field.
   * - Must be a number.
   *
   * @type {number}
   */
  @IsNotEmpty()
  @IsNumber()
  status_id!: number;
}
