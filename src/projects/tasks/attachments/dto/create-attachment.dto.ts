import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, MaxLength, IsPositive } from 'class-validator';

/**
 * Create task attachment DTO class.
 *
 * @version 0.0.1
 *
 * Data transfer object for creating a task attachment.
 */
export class CreateTaskAttachmentDto {
  /**
   * Task ID to which the attachment belongs.
   *
   * - Optional field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsPositive()
  @IsOptional()
  taskId?: number;

  /**
   * Comment ID to which the attachment belongs.
   *
   * - Optional field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsPositive()
  @IsOptional()
  commentId?: number;

  /**
   * Name of the file.
   *
   * - Required field.
   * - Must be a string.
   * - Maximum length: 255 characters.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  /**
   * Path to the file.
   *
   * - Required field.
   * - Must be a string.
   * - Maximum length: 255 characters.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filePath!: string;

  /**
   * Type of the file (e.g., PDF, JPEG).
   *
   * - Required field.
   * - Must be a string.
   * - Maximum length: 50 characters.
   *
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  fileType!: string;

  /**
   * Size of the file in bytes.
   *
   * - Required field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  fileSize!: number;

  /**
   * SHA-256 hash of the file for integrity check.
   *
   * - Optional field.
   *
   * @type {Buffer}
   */
  @IsOptional()
  fileHash?: Buffer;

  /**
   * Storage provider (e.g., local, s3, gcs).
   *
   * - Optional field.
   * - Must be a string.
   * - Maximum length: 32 characters.
   *
   * @type {string}
   */
  @IsString()
  @IsOptional()
  @MaxLength(32)
  storageProvider?: string;

  /**
   * If the file was embedded in rich text.
   *
   * - Required field.
   * - Must be a boolean.
   *
   * @type {boolean}
   */
  @IsBoolean()
  @IsNotEmpty()
  isInline!: boolean;

  /**
   * Tenant User ID who created the attachment.
   *
   * - Required field.
   * - Must be a positive number.
   *
   * @type {number}
   */
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  createdBy!: number;
}
