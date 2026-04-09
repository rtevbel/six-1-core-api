import { Module } from '@nestjs/common';
import { ProjectTaskStatusesService } from './project_task_statuses.service';
import { ProjectTaskStatusesController } from './project_task_statuses.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTaskStatusEntity } from './entities/project_task_status.entity';

/**
 * ProjectTaskStatusesModule is responsible for managing project task statuses.
 * It includes the controller and service for handling operations
 * related to project task statuses and integrates necessary configurations.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the ProjectTaskStatusEntity for TypeORM.
    TypeOrmModule.forFeature([ProjectTaskStatusEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [ProjectTaskStatusesController],

  // Specifies the providers that contain the business logic.
  providers: [ProjectTaskStatusesService],
  exports: [ProjectTaskStatusesService],
})
export class ProjectTaskStatusesModule {}
