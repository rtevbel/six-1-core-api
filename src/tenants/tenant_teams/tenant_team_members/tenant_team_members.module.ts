import { Module } from '@nestjs/common';
import { TenantTeamMembersService } from './tenant_team_members.service';
import { TenantTeamMembersController } from './tenant_team_members.controller';

@Module({
  controllers: [TenantTeamMembersController],
  providers: [TenantTeamMembersService],
})
export class TenantTeamMembersModule {}
