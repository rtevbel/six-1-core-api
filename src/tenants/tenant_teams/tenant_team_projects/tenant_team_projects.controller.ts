import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantTeamProjectsService } from './tenant_team_projects.service';
import { CreateTenantTeamProjectDto } from './dto/create-tenant_team_project.dto';
import { UpdateTenantTeamProjectDto } from './dto/update-tenant_team_project.dto';

@Controller()
export class TenantTeamProjectsController {
  constructor(
    private readonly tenantTeamProjectsService: TenantTeamProjectsService,
  ) {}

  @MessagePattern('createTenantTeamProject')
  create(@Payload() createTenantTeamProjectDto: CreateTenantTeamProjectDto) {
    return this.tenantTeamProjectsService.create(createTenantTeamProjectDto);
  }

  @MessagePattern('findAllTenantTeamProjects')
  findAll() {
    return this.tenantTeamProjectsService.findAll();
  }

  @MessagePattern('findOneTenantTeamProject')
  findOne(@Payload() id: number) {
    return this.tenantTeamProjectsService.findOne(id);
  }

  @MessagePattern('updateTenantTeamProject')
  update(@Payload() updateTenantTeamProjectDto: UpdateTenantTeamProjectDto) {
    return this.tenantTeamProjectsService.update(
      updateTenantTeamProjectDto.id,
      updateTenantTeamProjectDto,
    );
  }

  @MessagePattern('removeTenantTeamProject')
  remove(@Payload() id: number) {
    return this.tenantTeamProjectsService.remove(id);
  }
}
