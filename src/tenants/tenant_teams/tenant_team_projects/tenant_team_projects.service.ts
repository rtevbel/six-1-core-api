import { Injectable } from '@nestjs/common';
import { CreateTenantTeamProjectDto } from './dto/create-tenant_team_project.dto';
import { UpdateTenantTeamProjectDto } from './dto/update-tenant_team_project.dto';

@Injectable()
export class TenantTeamProjectsService {
  create(createTenantTeamProjectDto: CreateTenantTeamProjectDto) {
    return 'This action adds a new tenantTeamProject';
  }

  findAll() {
    return `This action returns all tenantTeamProjects`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tenantTeamProject`;
  }

  update(id: number, updateTenantTeamProjectDto: UpdateTenantTeamProjectDto) {
    return `This action updates a #${id} tenantTeamProject`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenantTeamProject`;
  }
}
