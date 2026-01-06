import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SharingAction } from '../../entities/sharing_log.entity';
import { SharedEntityType } from '../../entities/sharing_invitation.entity';

export class FiltersSharingLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharingId?: number;

  @IsOptional()
  @IsEnum(['resource', 'project', 'task'])
  sharedEntityType?: SharedEntityType;

  @IsOptional()
  @IsEnum([
    'shared',
    'requested',
    'accepted',
    'rejected',
    'revoked',
    'permission_updated',
  ])
  action?: SharingAction;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  performedBy?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsIn(['logId', 'createdAt'])
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
