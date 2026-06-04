import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO for updating an existing ProcessTemplateStepDescription.
 * Fields are explicit (not PartialType) so RPC whitelist retains validators.
 */
export class UpdateProcessTemplateStepDescriptionDto {
  @IsOptional()
  @IsNumber()
  processTemplateStepDescriptionId?: number;

  @IsNumber()
  languageId!: number;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
