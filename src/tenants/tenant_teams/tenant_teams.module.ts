import { Module } from '@nestjs/common';
import { TenantTeamService } from './tenant_teams.service';
import { TenantTeamController } from './tenant_teams.controller';
import { TenantTeamMembersModule } from './tenant_team_members/tenant_team_members.module';
import { TenantTeamProjectsModule } from './tenant_team_projects/tenant_team_projects.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantTeamEntity } from './entities/tenant_team.entity';

/**
 * TenantTeamsModule is responsible for managing tenant teams.
 * It includes the controller and service for handling operations related to tenant teams
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantTeamEntity]),
    TenantTeamMembersModule,
    TenantTeamProjectsModule,
  ],
  controllers: [TenantTeamController],
  providers: [TenantTeamService],
})
export class TenantTeamsModule {}
