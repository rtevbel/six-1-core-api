// src/storage/dto/presign-download.dto.ts
import { IsOptional, IsString, IsBoolean, IsNumber } from "class-validator";

/**
 * Data Transfer Object for generating a presigned URL for downloading a file.
 */
export class PresignDownloadDto {
  /**
   * The unique key of the file to be downloaded.
   */
  @IsString()
  key!: string;

  /**
   * The bucket where the file is stored.
   * Optional field.
   */
  @IsOptional()
  @IsString()
  bucket?: string;

  /**
   * The expiration time for the presigned URL in seconds.
   * Optional field.
   */
  @IsOptional()
  @IsNumber()
  expiresIn?: number;

  /**
   * Whether the file should be displayed inline in the browser.
   * Optional field.
   */
  @IsOptional()
  @IsBoolean()
  inline?: boolean;

  /**
   * The name of the file to be used for the download.
   * Optional field.
   */
  @IsOptional()
  @IsString()
  name?: string;
}