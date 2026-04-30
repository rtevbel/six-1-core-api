import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ComposeRuntimeSubmitPayloadDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  entityKey!: string;

  @IsIn(['create', 'update'])
  operation!: 'create' | 'update';

  @IsObject()
  fieldValues!: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  relationBlocks?: Record<string, unknown>;
}
