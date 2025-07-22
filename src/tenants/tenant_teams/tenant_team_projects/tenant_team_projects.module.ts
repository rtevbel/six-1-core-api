import { Module } from '@nestjs/common';
import { TenantTeamProjectsService } from './tenant_team_projects.service';
import { TenantTeamProjectsController } from './tenant_team_projects.controller';

@Module({
  controllers: [TenantTeamProjectsController],
  providers: [TenantTeamProjectsService],
})
export class TenantTeamProjectsModule {}
