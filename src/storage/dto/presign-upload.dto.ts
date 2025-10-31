import { IsString, IsOptional, IsNumber } from 'class-validator';

/**
 * Data Transfer Object for presigned upload requests.
 * This DTO is used to validate and transfer data for generating
 * presigned URLs for file uploads.
 */
export class PresignUploadDto {
  /**
   * The key (path) where the file will be stored.
   * This is required, but the server can generate the key if not provided.
   */
  @IsString()
  key!: string;

  /**
   * The content type (MIME type) of the file to be uploaded.
   * This is optional and can be inferred by the server if not provided.
   */
  @IsOptional()
  @IsString()
  contentType?: string;

  /**
   * The expiration time (in seconds) for the presigned URL.
   * This is optional and defaults to a server-defined value if not provided.
   */
  @IsOptional()
  @IsNumber()
  expiresIn?: number;
}
