import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class GetRelatedObjectsDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsInt()
  @Min(1)
  coreId!: number;
}

