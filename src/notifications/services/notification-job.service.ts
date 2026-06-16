import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationDispatchPipelineService } from './notification-dispatch-pipeline.service';
import { EventLogsService } from '../../events/event_logs/event_logs.service';

/**
 * Cron sweeper for notification prepare + send (P8 keeps this as retry/fallback).
 */
@Injectable()
export class NotificationJobService {
  private readonly logger = new Logger(NotificationJobService.name);

  constructor(
    private readonly pipeline: NotificationDispatchPipelineService,
    private readonly eventLogsService: EventLogsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleNotificationJob(): Promise<void> {
    await this.prepareNotificationsFromEventLogs();
    await this.pipeline.dispatchPendingNotifications();
  }

  /**
   * Processes unhandled event logs (sweeper when immediate dispatch missed).
   */
  private async prepareNotificationsFromEventLogs(): Promise<void> {
    const eventLogs = await this.eventLogsService.getAllEventLogs();

    for (const eventLog of eventLogs) {
      try {
        await this.pipeline.processEventLog(eventLog.logId);
      } catch (error) {
        this.logger.error(
          `Sweeper failed for eventLog ${eventLog.logId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
