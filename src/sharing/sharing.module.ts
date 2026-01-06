import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedResourceEntity } from './entities/shared_resource.entity';
import { SharedProjectEntity } from './entities/shared_project.entity';
import { SharedTaskEntity } from './entities/shared_task.entity';
import { SharingInvitationEntity } from './entities/sharing_invitation.entity';
import { SharingLogEntity } from './entities/sharing_log.entity';
import { SharedResourcesService } from './services/shared_resources.service';
import { SharedProjectsService } from './services/shared_projects.service';
import { SharedTasksService } from './services/shared_tasks.service';
import { SharingInvitationsService } from './services/sharing_invitations.service';
import { SharingLogsService } from './services/sharing_logs.service';
import { SharedResourcesController } from './controllers/shared_resources.controller';
import { SharedProjectsController } from './controllers/shared_projects.controller';
import { SharedTasksController } from './controllers/shared_tasks.controller';
import { SharingInvitationsController } from './controllers/sharing_invitations.controller';
import { SharingLogsController } from './controllers/sharing_logs.controller';

/**
 * SharingModule groups all functionality related to cross-tenant sharing.
 *
 * It registers:
 *  - TypeORM entities for shared resources, projects and tasks.
 *  - Sharing invitations and logs for auditing/traceability.
 *  - Controllers and services that expose this functionality over RPC.
 *
 * The commenting style is aligned with the `EventsModule` to keep modules
 * consistent across the codebase.
 */

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SharedResourceEntity,
      SharedProjectEntity,
      SharedTaskEntity,
      SharingInvitationEntity,
      SharingLogEntity,
    ]),
  ],
  controllers: [
    SharedResourcesController,
    SharedProjectsController,
    SharedTasksController,
    SharingInvitationsController,
    SharingLogsController,
  ],
  providers: [
    SharedResourcesService,
    SharedProjectsService,
    SharedTasksService,
    SharingInvitationsService,
    SharingLogsService,
  ],
  exports: [
    SharedResourcesService,
    SharedProjectsService,
    SharedTasksService,
    SharingInvitationsService,
    SharingLogsService,
  ],
})
export class SharingModule {}
