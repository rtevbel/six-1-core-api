import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  ProjectPermissionLevel,
  SharingStatus,
} from '../../entities/shared_project.entity';

export class CreateSharedProjectDto {
  @IsNumber()
  @IsNotEmpty()
  projectId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedByTenantId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedWithTenantId!: number;

  @IsEnum(['view', 'edit', 'manage'])
  permissionLevel!: ProjectPermissionLevel;

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
