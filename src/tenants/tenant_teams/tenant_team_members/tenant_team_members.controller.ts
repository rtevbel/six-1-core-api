import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantTeamMembersService } from './tenant_team_members.service';
import { CreateTenantTeamMemberDto } from './dto/create-tenant_team_member.dto';
import { UpdateTenantTeamMemberDto } from './dto/update-tenant_team_member.dto';

@Controller()
export class TenantTeamMembersController {
  constructor(
    private readonly tenantTeamMembersService: TenantTeamMembersService,
  ) {}

  @MessagePattern('createTenantTeamMember')
  create(@Payload() createTenantTeamMemberDto: CreateTenantTeamMemberDto) {
    return this.tenantTeamMembersService.create(createTenantTeamMemberDto);
  }

  @MessagePattern('findAllTenantTeamMembers')
  findAll() {
    return this.tenantTeamMembersService.findAll();
  }

  @MessagePattern('findOneTenantTeamMember')
  findOne(@Payload() id: number) {
    return this.tenantTeamMembersService.findOne(id);
  }

  @MessagePattern('updateTenantTeamMember')
  update(@Payload() updateTenantTeamMemberDto: UpdateTenantTeamMemberDto) {
    return this.tenantTeamMembersService.update(
      updateTenantTeamMemberDto.id,
      updateTenantTeamMemberDto,
    );
  }

  @MessagePattern('removeTenantTeamMember')
  remove(@Payload() id: number) {
    return this.tenantTeamMembersService.remove(id);
  }
}
