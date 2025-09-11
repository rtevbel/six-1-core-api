/**
 * Interface representing a Scheduler Port.
 * This defines the contract for scheduling jobs with a delay.
 */
export interface SchedulerPort {
    /**
     * Schedules a job to be executed after a specified delay.
     * 
     * @param delayMs - The delay in milliseconds before the job is executed.
     * @param jobName - The name of the job to be scheduled.
     * @param data - Any additional data required for the job.
     * @returns A Promise that resolves when the job is successfully scheduled.
     */
    schedule(delayMs: number, jobName: string, data: any): Promise<void>;
  }
  
  /**
   * A unique symbol used as a token for dependency injection of the SchedulerPort.
   * This ensures that the SchedulerPort can be injected and identified uniquely in the application.
   */
  export const SCHEDULER_PORT = Symbol('SCHEDULER_PORT');