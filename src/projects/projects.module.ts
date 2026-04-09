import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { AutomationModule } from '../automation/automation.module';
import { ProjectTaskStatusesModule } from './project_task_statuses/project_task_statuses.module';
import { TasksModule } from './tasks/tasks.module';
import { ProcessTemplatesModule } from '../process_templates/process_templates.module';
import { ProjectStepStatusMappingService } from './project_step_status_mapping.service';
import { ProjectStepStatusMappingEntity } from './entities/project_step_status_mappings.entity';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';

/**
 * ProjectsModule is responsible for managing projects.
 * It includes the controller and service for handling operations
 * related to projects and integrates necessary configurations.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the ProjectEntity , ProjectStepStatusMappingEntity for TypeORM.
    TypeOrmModule.forFeature([ProjectEntity, ProjectStepStatusMappingEntity]),
    ProcessTemplatesModule,
    ProjectTaskStatusesModule,
    TasksModule,
    AutomationModule,
    ConfigObjectsModule,
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [ProjectsController],

  // Specifies the providers that contain the business logic.
  providers: [ProjectsService, ProjectStepStatusMappingService],
})
export class ProjectsModule {}
