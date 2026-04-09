import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ConfigObjectStatusSource } from '../entities/config_object_status_mapping.entity';

export class ListConfigStatusMappingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;
}

export class CreateConfigStatusMappingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  stateKey!: string;

  @IsString()
  @IsIn(['system_status', 'project_task_status', 'native_enum', 'custom'])
  statusSource!: ConfigObjectStatusSource;

  @IsString()
  @IsNotEmpty()
  statusValue!: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isTerminal?: boolean;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

export class UpdateConfigStatusMappingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  configObjectStatusMappingId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsString()
  @IsIn(['system_status', 'project_task_status', 'native_enum', 'custom'])
  @IsOptional()
  statusSource?: ConfigObjectStatusSource;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  statusValue?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  stateKey?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isTerminal?: boolean;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

export class DeleteConfigStatusMappingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  configObjectStatusMappingId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  deletedBy!: number;
}

export class ResolveLifecycleStateFromStatusDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsIn(['system_status', 'project_task_status', 'native_enum', 'custom'])
  statusSource!: ConfigObjectStatusSource;

  @IsString()
  @IsNotEmpty()
  statusValue!: string;
}

export class ResolveStatusFromLifecycleStateDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  stateKey!: string;

  @IsString()
  @IsIn(['system_status', 'project_task_status', 'native_enum', 'custom'])
  @IsOptional()
  statusSource?: ConfigObjectStatusSource;
}
