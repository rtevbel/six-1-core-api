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
 * Interface for a calendar provider service.
 * Provides methods to retrieve timezone, check if a date is an off date,
 * and get working intervals for a specific date and weekday.
 */
export interface CalendarProvider {
  /**
   * Retrieves the timezone for a given tenant and optional tenant user.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The optional ID of the tenant user.
   * @returns A promise that resolves to the timezone string.
   */
  getTimezone(tenantId: number, tenantUserId?: number | null): Promise<string>;

  /**
   * Checks if a given date is an off date (non-working day) in the local timezone.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The optional ID of the tenant user.
   * @param localISODate - The date in ISO format (e.g., 'YYYY-MM-DD').
   * @returns A promise that resolves to a boolean indicating if the date is an off date.
   */
  isOffDateLocal(
    tenantId: number,
    tenantUserId: number | null | undefined,
    localISODate: string,
  ): Promise<boolean>;

  /**
   * Retrieves the working intervals for a specific date and weekday in the local timezone.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The optional ID of the tenant user.
   * @param localISODate - The date in ISO format (e.g., 'YYYY-MM-DD').
   * @param weekday - The day of the week.
   * @returns A promise that resolves to an array of time intervals.
   */
  getWorkingIntervalsLocal(
    tenantId: number,
    tenantUserId: number | null | undefined,
    localISODate: string,
    weekday: Weekday,
  ): Promise<TimeInterval[]>;
}

/**
 * Interface for a task context provider service.
 * Provides methods to retrieve the context of a task, including tenant and user information.
 */
export interface TaskContextProvider {
  /**
   * Retrieves the context for a given task.
   * @param taskId - The ID of the task.
   * @returns A promise that resolves to an object containing tenant and user information.
   */
  getTaskContext(taskId: number): Promise<{ tenantId: number; tenantUserId: number | null }>;
}

/**
 * Constant identifier for the calendar provider service.
 */
export const CALENDAR_PROVIDER = 'CALENDAR_PROVIDER';

/**
 * Constant identifier for the task context provider service.
 */
export const TASK_CONTEXT_PROVIDER = 'TASK_CONTEXT_PROVIDER';