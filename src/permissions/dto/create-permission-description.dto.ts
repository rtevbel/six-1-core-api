import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePermissionDescriptionDto {
  @IsNotEmpty()
  @IsNumber()
  language_id: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @MaxLength(65535)
  description?: string;
}
