import { Injectable } from '@nestjs/common';
import { CreateTenantTeamDto } from './dto/create-tenant_team.dto';
import { UpdateTenantTeamDto } from './dto/update-tenant_team.dto';

@Injectable()
export class TenantTeamsService {
  create(createTenantTeamDto: CreateTenantTeamDto) {
    return 'This action adds a new tenantTeam';
  }

  findAll() {
    return `This action returns all tenantTeams`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tenantTeam`;
  }

  update(id: number, updateTenantTeamDto: UpdateTenantTeamDto) {
    return `This action updates a #${id} tenantTeam`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenantTeam`;
  }
}
