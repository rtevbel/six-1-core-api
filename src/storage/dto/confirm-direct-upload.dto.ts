import { IsOptional, IsString } from "class-validator";

/**
 * Data Transfer Object for confirming a direct upload.
 */
export class ConfirmDirectUploadDto {
  /**
   * The unique key of the uploaded file.
   */
  @IsString()
  key!: string;

  /**
   * The bucket where the file was uploaded.
   * Optional field.
   */
  @IsOptional()
  @IsString()
  bucket?: string;
}