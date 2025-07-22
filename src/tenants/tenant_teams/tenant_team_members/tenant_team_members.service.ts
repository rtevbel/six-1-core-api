import { Injectable } from '@nestjs/common';
import { CreateTenantTeamMemberDto } from './dto/create-tenant_team_member.dto';
import { UpdateTenantTeamMemberDto } from './dto/update-tenant_team_member.dto';

@Injectable()
export class TenantTeamMembersService {
  create(createTenantTeamMemberDto: CreateTenantTeamMemberDto) {
    return 'This action adds a new tenantTeamMember';
  }

  findAll() {
    return `This action returns all tenantTeamMembers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tenantTeamMember`;
  }

  update(id: number, updateTenantTeamMemberDto: UpdateTenantTeamMemberDto) {
    return `This action updates a #${id} tenantTeamMember`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenantTeamMember`;
  }
}
