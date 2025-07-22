import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantTeamProjectDto } from './create-tenant_team_project.dto';

export class UpdateTenantTeamProjectDto extends PartialType(
  CreateTenantTeamProjectDto,
) {
  id!: number;
}
