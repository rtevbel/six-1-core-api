export const MICROSERVICE_SCHEDULE_TASK_WINDOW_PATTERN = 'v0.1_schedule_task';
export const MICROSERVICE_SCHEDULE_TASk_WINDOW_PATTERN =
  'v0.1_scheduler_task_scheduleWindow';
export const MICROSERVICE_SCHEDULE_TASk_FROM_SHIFT_PATTERN =
  'v0.1_scheduler_task_scheduleFromShifts';
export const MICROSERVICE_PLAN_PROJECT_PATTERN = 'v0.1_scheduler_project_plan';
export const MICROSERVICE_COMMIT_PLAN_PATTERN = 'v0.1_scheduler_project_commit';
export const MICROSERVICE_FIND_ALL_SCHEDULES_PATTERN =
  'v0.1_scheduler_find_all';
export const MICROSERVICE_FIND_ONE_SCHEDULE_PATTERN = 'v0.1_scheduler_find_one';
export const MICROSERVICE_FIND_ALL_BY_TASK_PATTERN =
  'v0.1_scheduler_find_all_by_task';
export const MICROSERVICE_RESCHEDULE_PATTERN = 'v0.1_scheduler_reschedule';
export const MICROSERVICE_PAUSE_PATTERN = 'v0.1_scheduler_pause';
export const MICROSERVICE_RESUME_PATTERN = 'v0.1_scheduler_resume';
export const MICROSERVICE_CANCEL_PATTERN = 'v0.1_scheduler_cancel';

// Resource patterns
export const MICROSERVICE_CREATE_RESOURCE_PATTERN = 'v0.1_resource_create';
export const MICROSERVICE_FIND_ALL_RESOURCES_PATTERN = 'v0.1_resource_find_all';
export const MICROSERVICE_FIND_ONE_RESOURCE_PATTERN = 'v0.1_resource_find_one';
export const MICROSERVICE_UPDATE_RESOURCE_PATTERN = 'v0.1_resource_update';
export const MICROSERVICE_REMOVE_RESOURCE_PATTERN = 'v0.1_resource_remove';

// Resource availability patterns
export const MICROSERVICE_CREATE_RESOURCE_AVAILABILITY_PATTERN =
  'v0.1_resource_availability_create';
export const MICROSERVICE_FIND_ALL_RESOURCE_AVAILABILITY_PATTERN =
  'v0.1_resource_availability_find_all';
export const MICROSERVICE_FIND_ONE_RESOURCE_AVAILABILITY_PATTERN =
  'v0.1_resource_availability_find_one';
export const MICROSERVICE_UPDATE_RESOURCE_AVAILABILITY_PATTERN =
  'v0.1_resource_availability_update';
export const MICROSERVICE_REMOVE_RESOURCE_AVAILABILITY_PATTERN =
  'v0.1_resource_availability_remove';

// Resource blackout patterns
export const MICROSERVICE_CREATE_RESOURCE_BLACKOUT_PATTERN =
  'v0.1_resource_blackout_create';
export const MICROSERVICE_FIND_ALL_RESOURCE_BLACKOUT_PATTERN =
  'v0.1_resource_blackout_find_all';
export const MICROSERVICE_FIND_ONE_RESOURCE_BLACKOUT_PATTERN =
  'v0.1_resource_blackout_find_one';
export const MICROSERVICE_UPDATE_RESOURCE_BLACKOUT_PATTERN =
  'v0.1_resource_blackout_update';
export const MICROSERVICE_REMOVE_RESOURCE_BLACKOUT_PATTERN =
  'v0.1_resource_blackout_remove';

// Resource Assignment patterns
export const MICROSERVICE_CREATE_RESOURCE_ASSIGNMENT_PATTERN =
  'v0.1_resource_assignment_create';
export const MICROSERVICE_FIND_ALL_RESOURCE_ASSIGNMENTS_PATTERN =
  'v0.1_resource_assignment_find_all';
export const MICROSERVICE_FIND_ONE_RESOURCE_ASSIGNMENT_PATTERN =
  'v0.1_resource_assignment_find_one';
export const MICROSERVICE_UPDATE_RESOURCE_ASSIGNMENT_PATTERN =
  'v0.1_resource_assignment_update';
export const MICROSERVICE_REMOVE_RESOURCE_ASSIGNMENT_PATTERN =
  'v0.1_resource_assignment_remove';

export const MESSAGE_BROKER_SCHEDULE_TASK_WINDOW_CLIENT_TOKEN =
  'schedule_task_service_token';

/**
 * Represents the days of the week.
 */
export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

/**
 * Represents a time interval with a start and end time.
 * The time format is 'HH:mm:ss'.
 */
export type TimeInterval = { start: string; end: string };

/**
 * Constant identifier for the calendar provider service.
 */
export const CALENDAR_PROVIDER = 'CALENDAR_PROVIDER';

/**
 * Constant identifier for the task context provider service.
 */
export const TASK_CONTEXT_PROVIDER = 'TASK_CONTEXT_PROVIDER';

export type BlockReason = 'none' | 'calendar' | 'dependency';
export type ScheduledTaskStatus =
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'expired';
