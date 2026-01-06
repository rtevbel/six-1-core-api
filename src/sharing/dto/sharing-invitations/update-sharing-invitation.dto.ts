import { PartialType } from '@nestjs/mapped-types';
import { CreateSharingInvitationDto } from './create-sharing-invitation.dto';

export class UpdateSharingInvitationDto extends PartialType(
  CreateSharingInvitationDto,
) {}
