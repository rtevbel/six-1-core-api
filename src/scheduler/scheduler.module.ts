import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

import { ScheduledTaskEntity } from './entities/scheduled_task.entity';
import { ScheduledTaskHistoryEntity } from './entities/scheduled_task_history.entity';
import { ScheduledTaskEventsEntity } from './entities/scheduled_task_event.entity';
import { TaskDependencyEntity } from './entities/task_dependency.entity';

import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './services/scheduler.service';
import { ScheduledTasksService } from './services/scheduled_tasks.service';
import { DependencyResolverService } from './services/dependency_resolver.service';
import { TaskProcessor } from './processors/task.processor';
import { HistoryService } from './services/history.service';
import { EventsService } from './services/events.service';

import { CalendarAdapter } from './adapters/calendar.adapter';
import { TaskContextAdapter } from './adapters/task_context.adapter';
import { CALENDAR_PROVIDER, TASK_CONTEXT_PROVIDER } from './core/interfaces';

import {
  MESSAGE_BROKER_SCHEDULE_TASK_WINDOW_CLIENT_TOKEN
} from './constants';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY
} from '../common/constants';
import { ensureDefinedConfigParam } from '../common/functions';

/**
 * SchedulerModule is responsible for managing scheduled tasks and their dependencies.
 * It includes the controller, services, and integrations required for scheduling tasks.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the entities for TypeORM.
    TypeOrmModule.forFeature([
      ScheduledTaskEntity,
      ScheduledTaskHistoryEntity,
      ScheduledTaskEntity,
      TaskDependencyEntity,
    ]),
    // Registers the BullMQ queue for task scheduling.
    BullModule.registerQueue({ name: 'task-scheduler' }),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_SCHEDULE_TASK_WINDOW_CLIENT_TOKEN,
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
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [SchedulerController],

  // Specifies the providers that contain the business logic.
  providers: [
    SchedulerService, // Main service for scheduling tasks.
    ScheduledTasksService, // Service for managing scheduled tasks.
    DependencyResolverService, // Service for resolving task dependencies.
    TaskProcessor, // Processor for handling task execution.
    HistoryService, // Service for managing task history.
    EventsService, // Service for managing task events.

    CalendarAdapter, // Adapter for calendar-related operations.
    { provide: CALENDAR_PROVIDER, useExisting: CalendarAdapter }, // Provides the calendar adapter.

    TaskContextAdapter, // Adapter for task context operations.
    { provide: TASK_CONTEXT_PROVIDER, useExisting: TaskContextAdapter }, // Provides the task context adapter.
  ],

  // Exports the SchedulerService for use in other modules.
  exports: [SchedulerService],
})
export class SchedulerModule {}