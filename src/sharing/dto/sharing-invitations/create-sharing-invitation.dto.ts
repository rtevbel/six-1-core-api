import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  InvitationStatus,
  SharedEntityType,
} from '../../entities/sharing_invitation.entity';

export class CreateSharingInvitationDto {
  @IsEnum(['resource', 'project', 'task'])
  sharedEntityType!: SharedEntityType;

  @IsNumber()
  @IsNotEmpty()
  sharedEntityId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedByTenantId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedWithTenantId!: number;

  @IsString()
  @MaxLength(255)
  invitationToken!: string;

  @IsDateString()
  @IsNotEmpty()
  expiresAt!: string;

  @IsEnum(['pending', 'accepted', 'rejected', 'requested'])
  @IsOptional()
  status?: InvitationStatus;
}
