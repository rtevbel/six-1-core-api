import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDescriptionDto {
  @IsNotEmpty()
  @IsNumber()
  language_id: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  description?: string;
}
