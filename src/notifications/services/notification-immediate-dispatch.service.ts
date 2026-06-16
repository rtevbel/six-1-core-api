import { Injectable } from '@nestjs/common';
import { NotificationPlatformFlagsService } from '../config/notification-platform-flags.service';
import { NotificationDispatchPipelineService } from './notification-dispatch-pipeline.service';

/**
 * P8 entry point — immediate prepare/send without blocking event consumers.
 */
@Injectable()
export class NotificationImmediateDispatchService {
  constructor(
    private readonly platformFlags: NotificationPlatformFlagsService,
    private readonly pipeline: NotificationDispatchPipelineService,
  ) {}

  isEnabled(): boolean {
    return this.platformFlags.isImmediateDispatchEnabled();
  }

  enqueueFromEventLog(eventLogId: number): void {
    if (!this.isEnabled()) {
      return;
    }
    this.pipeline.enqueueEventLogDispatch(eventLogId);
  }

  enqueueNotificationSend(notificationId: number): void {
    if (!this.isEnabled()) {
      return;
    }
    this.pipeline.enqueueNotificationSend(notificationId);
  }
}
