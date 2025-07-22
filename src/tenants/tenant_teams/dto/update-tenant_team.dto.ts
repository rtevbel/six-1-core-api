import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantTeamDto } from './create-tenant_team.dto';

export class UpdateTenantTeamDto extends PartialType(CreateTenantTeamDto) {
  id!: number;
}
