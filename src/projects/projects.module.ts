import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ensureDefinedConfigParam } from '../common/functions';
import { MESSAGE_BROKER_PROJECT_SERVICE_CLIENT_TOKEN } from './constants';
import {AutomationModule} from "../automation/automation.module";

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../common/constants';
import { ProjectTaskStatusesModule } from './project_task_statuses/project_task_statuses.module';
import { TasksModule } from './tasks/tasks.module';
import { ProcessTemplatesModule } from '../process_templates/process_templates.module';
import {ProjectStepStatusMappingService} from "./project_step_status_mapping.service";
import {ProjectStepStatusMappingEntity} from "./entities/project_step_status_mappings.entity";

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
    TypeOrmModule.forFeature([ProjectEntity,ProjectStepStatusMappingEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_PROJECT_SERVICE_CLIENT_TOKEN,
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              // Constructs the message broker URL using configuration parameters.
              ensureDefinedConfigParam(
                configService.get<string>(MESSAGE_BROKER_URL_KEY),
                MESSAGE_BROKER_URL_KEY,
              ) +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_USERNAME_KEY),
                  MESSAGE_BROKER_USERNAME_KEY,
                ) +
                ':' +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_PASSWORD_KEY),
                  MESSAGE_BROKER_PASSWORD_KEY,
                ) +
                '@' +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_HOST_KEY),
                  MESSAGE_BROKER_HOST_KEY,
                ) +
                ':' +
                ensureDefinedConfigParam(
                  configService.get<number>(MESSAGE_BROKER_PORT_KEY),
                  MESSAGE_BROKER_PORT_KEY,
                ),
            ],
            // Specifies the queue name and options.
            queue: configService.get(SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ProcessTemplatesModule,
    ProjectTaskStatusesModule,
    TasksModule,
    AutomationModule
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [ProjectsController],
  
  // Specifies the providers that contain the business logic.
  providers: [ProjectsService,ProjectStepStatusMappingService],
})
export class ProjectsModule {}
