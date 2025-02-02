import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {AppLanguagesEnum} from "../../common/enums/app-languages.enum";
import {Transform} from "class-transformer";
import sanitizeHtml from "sanitize-html";

export class CreateRoleDescriptionDto {
  @IsNotEmpty()
  @IsNumber()
  language_id: number = AppLanguagesEnum.English;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value.trim())
  @MaxLength(50)
  name: string = '';

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  @Transform(({ value }) => sanitizeHtml(value)) // Removes harmful HTML tags
  description?: string;
}
