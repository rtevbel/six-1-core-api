import { Injectable } from '@nestjs/common';
import type { NotificationContext } from '../notification-context.types';
import type { NormalizedNotificationContextSource } from '../notification-context-source.util';

/**
 * Fills `event.*` and `payload.*` from normalized source (no I/O).
 */
@Injectable()
export class BuiltinNamespaceProvider {
  apply(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
  ): void {
    context.event.name = source.eventName;
    context.event.occurredAt = source.occurredAt?.toISOString?.() ?? null;
    context.event.correlationId = source.correlationId;
    context.event.causationId = source.causationId;
    context.payload = { ...source.payload };
  }
}
