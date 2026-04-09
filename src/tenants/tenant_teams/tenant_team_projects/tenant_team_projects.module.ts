import { Module } from '@nestjs/common';
import { TenantTeamProjectService } from './tenant_team_projects.service';
import { TenantTeamProjectController } from './tenant_team_projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantTeamProjectEntity } from './entities/tenant_team_project.entity';

/**
 * TenantTeamProjectsModule is responsible for managing tenant team projects.
 * It includes the controller and service for handling operations related to tenant team projects
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantTeamProjectEntity]),
  ],
  controllers: [TenantTeamProjectController],
  providers: [TenantTeamProjectService],
})
export class TenantTeamProjectsModule {}
