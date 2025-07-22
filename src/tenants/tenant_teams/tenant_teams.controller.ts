import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantTeamsService } from './tenant_teams.service';
import { CreateTenantTeamDto } from './dto/create-tenant_team.dto';
import { UpdateTenantTeamDto } from './dto/update-tenant_team.dto';

@Controller()
export class TenantTeamsController {
  constructor(private readonly tenantTeamsService: TenantTeamsService) {}

  @MessagePattern('createTenantTeam')
  create(@Payload() createTenantTeamDto: CreateTenantTeamDto) {
    return this.tenantTeamsService.create(createTenantTeamDto);
  }

  @MessagePattern('findAllTenantTeams')
  findAll() {
    return this.tenantTeamsService.findAll();
  }

  @MessagePattern('findOneTenantTeam')
  findOne(@Payload() id: number) {
    return this.tenantTeamsService.findOne(id);
  }

  @MessagePattern('updateTenantTeam')
  update(@Payload() updateTenantTeamDto: UpdateTenantTeamDto) {
    return this.tenantTeamsService.update(
      updateTenantTeamDto.id,
      updateTenantTeamDto,
    );
  }

  @MessagePattern('removeTenantTeam')
  remove(@Payload() id: number) {
    return this.tenantTeamsService.remove(id);
  }
}
