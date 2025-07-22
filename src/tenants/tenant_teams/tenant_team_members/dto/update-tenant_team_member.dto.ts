import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantTeamMemberDto } from './create-tenant_team_member.dto';

export class UpdateTenantTeamMemberDto extends PartialType(
  CreateTenantTeamMemberDto,
) {
  id!: number;
}
