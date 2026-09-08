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
import { ResourceMetaEntity } from './entities/resource_meta.entity';
import { TaskDependencyEntity } from './entities/task_dependency.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';
import { TenantConfigurationsEntity } from '../tenants/tenant_configurations/entities/tenant_configuration.entity';
import { TenantUserConfigurationsEntity } from '../tenants/tenant_users/tenant_user_configurations/entities/tenant_user_configuration.entity';
import { TenantWorkingHoursEntity } from '../tenants/tenant_working_hours/entities/tenant_working_hour.entity';
import { TenantUserWorkingHoursEntity } from '../tenants/tenant_users/tenant_user_working_hours/entities/tenant_user_working_hour.entity';
import { TenantOffDaysEntity } from '../tenants/tenant_off_days/entities/tenant_off_day.entity';
import { TenantUserOffDaysEntity } from '../tenants/tenant_users/tenant_user_off_days/entities/tenant_user_off_day.entity';
import { TenantTeamMemberEntity } from '../tenants/tenant_teams/tenant_team_members/entities/tenant_team_member.entity';

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
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { AutomationModule } from '../automation/automation.module';
import { SchedulerController } from './scheduler.controller';
import { ResourceAssignmentsController } from './controllers/resource_assignments.controller';
import { ResourcesController } from './controllers/resources.controller';
import { ResourceAvailabilityController } from './controllers/resource_availability.controller';
import { ResourceBlackoutDatesController } from './controllers/resource_blackout_dates.controller';

import { CalendarAdapter } from './adapters/calendar.adapter';
import { TaskContextAdapter } from './adapters/task_context.adapter';
import { CALENDAR_PROVIDER, TASK_CONTEXT_PROVIDER } from './constants';
import {
  ConstraintCapacityEngine,
  ResourceAvailabilityAdapter,
} from './constraints';

import {
  REDIS_DATABASE_HOST_KEY,
  REDIS_DATABASE_PASSWORD_KEY,
  REDIS_DATABASE_PORT_KEY,
} from '../auth/constants';

/**
 * SchedulerModule manages live scheduling, resources, and constraint capacity.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ScheduledTaskEntity,
      ScheduledTaskHistoryEntity,
      ScheduledTaskEventsEntity,
      ResourceAssignmentShiftEntity,
      ResourceEntity,
      ResourceAssignmentEntity,
      ResourceAvailabilityEntity,
      ResourceBlackoutDateEntity,
      ResourceMetaEntity,
      TaskDependencyEntity,
      TaskEntity,
      TenantConfigurationsEntity,
      TenantUserConfigurationsEntity,
      TenantWorkingHoursEntity,
      TenantUserWorkingHoursEntity,
      TenantOffDaysEntity,
      TenantUserOffDaysEntity,
      TenantTeamMemberEntity,
    ]),
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
    ConfigObjectsModule,
    AutomationModule,
  ],
  controllers: [
    SchedulerController,
    ResourceAssignmentsController,
    ResourcesController,
    ResourceAvailabilityController,
    ResourceBlackoutDatesController,
  ],
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
    ResourceAvailabilityAdapter,
    ConstraintCapacityEngine,
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
    ConstraintCapacityEngine,
    SchedulerService,
  ],
})
export class SchedulerModule {}
