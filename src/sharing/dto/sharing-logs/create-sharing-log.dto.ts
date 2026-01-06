import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SharingAction } from '../../entities/sharing_log.entity';
import { SharedEntityType } from '../../entities/sharing_invitation.entity';

export class CreateSharingLogDto {
  @IsNumber()
  @IsNotEmpty()
  sharingId!: number;

  @IsEnum(['resource', 'project', 'task'])
  sharedEntityType!: SharedEntityType;

  @IsEnum([
    'shared',
    'requested',
    'accepted',
    'rejected',
    'revoked',
    'permission_updated',
  ])
  action!: SharingAction;

  @IsNumber()
  @IsNotEmpty()
  performedBy!: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  createdAt?: string;
}
