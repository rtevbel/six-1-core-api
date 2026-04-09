import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { ProcessTemplateStepsModule } from '../../process_templates/process_template_steps/process_template_steps.module';
import { ProjectTaskStatusesModule } from '../project_task_statuses/project_task_statuses.module';
import { CommentsModule } from './comments/comments.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { MentionsModule } from './mentions/mentions.module';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * TasksModule is responsible for managing tasks.
 * It includes the controller and service for handling operations
 * related to tasks and integrates necessary configurations.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TaskEntity for TypeORM.
    TypeOrmModule.forFeature([TaskEntity]),
    ProcessTemplateStepsModule,
    ProjectTaskStatusesModule,
    CommentsModule,
    AttachmentsModule,
    MentionsModule,
    ConfigObjectsModule,
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TasksController],

  // Specifies the providers that contain the business logic.
  providers: [TasksService],

  //Specifies the providers that are exposed as API from this module
  exports: [TasksService],
})
export class TasksModule {}
