import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  SharingStatus,
  TaskPermissionLevel,
} from '../../entities/shared_task.entity';

export class CreateSharedTaskDto {
  @IsNumber()
  @IsNotEmpty()
  taskId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedByTenantId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedWithTenantId!: number;

  @IsEnum(['view', 'edit', 'assign'])
  permissionLevel!: TaskPermissionLevel;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsEnum(['pending', 'active', 'revoked'])
  @IsOptional()
  sharingStatus?: SharingStatus;
}
