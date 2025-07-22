import { Module } from '@nestjs/common';
import { TenantTeamsService } from './tenant_teams.service';
import { TenantTeamsController } from './tenant_teams.controller';
import { TenantTeamMembersModule } from './tenant_team_members/tenant_team_members.module';
import { TenantTeamProjectsModule } from './tenant_team_projects/tenant_team_projects.module';

@Module({
  controllers: [TenantTeamsController],
  providers: [TenantTeamsService],
  imports: [TenantTeamMembersModule, TenantTeamProjectsModule],
})
export class TenantTeamsModule {}
