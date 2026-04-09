import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduledTaskEntity } from './entities/scheduled_task.entity';
import { ScheduledTaskHistoryEntity } from './entities/scheduled_task_history.entity';
import { ScheduledTaskEventsEntity } from './entities/scheduled_task_event.entity';
import { ResourceAssignmentShiftEntity } from './entities/resource_assignment_shifts.entity';
import { ResourceEntity } from './entities/resource.entity';
import { ResourceAssignmentEntity } from './entities/resource_assignment.entity';
import { ResourceAvailabilityEntity } from './entities/resource_availability.entity';
import { ResourceBlackoutDateEntity } from './entities/resource_blackout_date.entity';
import { TaskDependencyEntity } from './entities/task_dependency.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';
import { TenantConfigurationsEntity } from '../tenants/tenant_configurations/entities/tenant_configuration.entity';
import { TenantUserConfigurationsEntity } from '../tenants/tenant_users/tenant_user_configurations/entities/tenant_user_configuration.entity';
import { TenantWorkingHoursEntity } from '../tenants/tenant_working_hours/entities/tenant_working_hour.entity';
import { TenantUserWorkingHoursEntity } from '../tenants/tenant_users/tenant_user_working_hours/entities/tenant_user_working_hour.entity';
import { TenantOffDaysEntity } from '../tenants/tenant_off_days/entities/tenant_off_day.entity';
import { TenantUserOffDaysEntity } from '../tenants/tenant_users/tenant_user_off_days/entities/tenant_user_off_day.entity';

import { SchedulerService } from './services/scheduler.service';
import { ScheduledTasksService } from './services/scheduled_tasks.service';
import { DependencyResolverService } from './services/dependency_resolver.service';
import { HistoryService } from './services/history.service';
import { EventsService } from './services/events.service';
import { ResourceAssignmentsService } from './services/resource_assignments.service';
import { ResourcesService } from './services/resources.service';
import { ResourceAvailabilityService } from './services/resource_availability.service';
import { ResourceBlackoutDatesService } from './services/resource_blackout_dates.service';
import { TaskProcessor } from './processors/task.processor';
import { SchedulerController } from './scheduler.controller';
import { ResourceAssignmentsController } from './controllers/resource_assignments.controller';
import { ResourcesController } from './controllers/resources.controller';
import { ResourceAvailabilityController } from './controllers/resource_availability.controller';
import { ResourceBlackoutDatesController } from './controllers/resource_blackout_dates.controller';

import { CalendarAdapter } from './adapters/calendar.adapter';
import { TaskContextAdapter } from './adapters/task_context.adapter';
import { CALENDAR_PROVIDER, TASK_CONTEXT_PROVIDER } from './constants';

import {
  REDIS_DATABASE_HOST_KEY,
  REDIS_DATABASE_PASSWORD_KEY,
  REDIS_DATABASE_PORT_KEY,
} from '../auth/constants';

/**
 * SchedulerModule is responsible for managing task scheduling.
 * It includes the controller, services, and configurations for scheduling tasks.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    ConfigModule,
    // Registers the entities for TypeORM.
    TypeOrmModule.forFeature([
      ScheduledTaskEntity,
      ScheduledTaskHistoryEntity,
      ScheduledTaskEventsEntity,
      ResourceAssignmentShiftEntity,
      ResourceEntity,
      ResourceAssignmentEntity,
      ResourceAvailabilityEntity,
      ResourceBlackoutDateEntity,
      TaskDependencyEntity,
      TaskEntity,
      TenantConfigurationsEntity,
      TenantUserConfigurationsEntity,
      TenantWorkingHoursEntity,
      TenantUserWorkingHoursEntity,
      TenantOffDaysEntity,
      TenantUserOffDaysEntity,
    ]),
    // Configure BullMQ connection (Redis) and the queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        connection: {
          host: config.get<string>(REDIS_DATABASE_HOST_KEY),
          port: config.get<number>(REDIS_DATABASE_PORT_KEY),
          password:
            config.get<string>(REDIS_DATABASE_PASSWORD_KEY) || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'task-scheduler' }),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [
    SchedulerController,
    ResourceAssignmentsController,
    ResourcesController,
    ResourceAvailabilityController,
    ResourceBlackoutDatesController,
  ],

  // Specifies the providers that contain the business logic.
  providers: [
    SchedulerService,
    ScheduledTasksService,
    DependencyResolverService,
    HistoryService,
    EventsService,
    ResourceAssignmentsService,
    ResourcesService,
    ResourceAvailabilityService,
    ResourceBlackoutDatesService,
    TaskProcessor,
    CalendarAdapter,
    { provide: CALENDAR_PROVIDER, useExisting: CalendarAdapter },
    TaskContextAdapter,
    { provide: TASK_CONTEXT_PROVIDER, useExisting: TaskContextAdapter },
  ],
  exports: [
    ResourceAssignmentsService,
    ResourcesService,
    ResourceAvailabilityService,
    ResourceBlackoutDatesService,
  ],
})
export class SchedulerModule {}
