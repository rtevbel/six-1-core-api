import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  InvitationStatus,
  SharedEntityType,
} from '../../entities/sharing_invitation.entity';

export class FiltersSharingInvitationDto {
  @IsOptional()
  @IsEnum(['resource', 'project', 'task'])
  sharedEntityType?: SharedEntityType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedEntityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedByTenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedWithTenantId?: number;

  @IsOptional()
  @IsEnum(['pending', 'accepted', 'rejected', 'requested'])
  status?: InvitationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsIn(['invitationId', 'expiresAt', 'createdAt'])
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
