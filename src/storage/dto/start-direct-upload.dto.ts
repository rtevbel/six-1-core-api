import { IsOptional, IsString, IsNumber } from 'class-validator';

/**
 * Data Transfer Object for starting a direct upload.
 */
export class StartDirectUploadDto {
  /**
   * The original file name provided by the client.
   */
  @IsString()
  filename!: string;

  /**
   * The content type of the file (e.g., "image/png").
   * Optional field.
   */
  @IsOptional()
  @IsString()
  contentType?: string;

  /**
   * The tenant ID associated with the upload.
   * Optional field.
   */
  @IsOptional()
  @IsString()
  tenantId?: string;

  /**
   * The user ID associated with the upload.
   * Optional field.
   */
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * The prefix for the file path (e.g., "attachments").
   * Optional field.
   */
  @IsOptional()
  @IsString()
  prefix?: string;

  /**
   * The bucket where the file will be stored.
   * Optional field.
   */
  @IsOptional()
  @IsString()
  bucket?: string;

  /**
   * The expiration time for the upload URL in seconds.
   * Optional field.
   */
  @IsOptional()
  @IsNumber()
  expiresIn?: number;
}
