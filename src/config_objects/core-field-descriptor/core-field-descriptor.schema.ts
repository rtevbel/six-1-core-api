import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { CORE_FIELD_PRIMITIVE_TYPES } from './core-field-descriptor.constants';

/**
 * class-validator projection of {@link CoreFieldDescriptor}.
 * Plain objects are validated via {@link validateCoreFieldDescriptor}.
 */
export class CoreFieldDescriptorValidationClass {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fieldKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsString()
  @IsIn([...CORE_FIELD_PRIMITIVE_TYPES])
  fieldType!: string;

  @IsInt()
  @Min(0)
  orderIndex!: number;

  @IsOptional()
  @IsBoolean()
  readOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  canCreate?: boolean;

  @IsOptional()
  @IsBoolean()
  canUpdate?: boolean;

  @IsOptional()
  @IsBoolean()
  requiredOnCreate?: boolean;

  @IsOptional()
  @IsBoolean()
  requiredOnUpdate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sectionKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;
}
