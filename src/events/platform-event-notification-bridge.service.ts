import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { EventEnvelope } from './types';
import { EventCatalogService } from './event-catalog.service';
import { EventLogsService } from './event_logs/event_logs.service';
import { CreateEventLogDto } from './event_logs/dto/create-event_log.dto';
import {
  isDeprecatedNotificationEventName,
  shouldCreateNotificationEventLog,
} from './constants/platform-event-names.constants';
import { PlatformEventFlagsService } from './config/platform-event-flags.service';
import { getDeprecatedEventEmitWarning } from './platform-event-naming.util';
import { NotificationImmediateDispatchService } from '../notifications/services/notification-immediate-dispatch.service';

/**
 * Creates notification `event_logs` from platform event envelopes.
 * Used by legacy {@link EventLogsController} and P1 bus consumer.
 */
@Injectable()
export class PlatformEventNotificationBridgeService {
  private readonly logger = new Logger(
    PlatformEventNotificationBridgeService.name,
  );

  constructor(
    private readonly logs: EventLogsService,
    private readonly catalog: EventCatalogService,
    private readonly platformFlags: PlatformEventFlagsService,
    private readonly immediateDispatch: NotificationImmediateDispatchService,
  ) {}

  shouldHandle(envelope: EventEnvelope): boolean {
    if (this.platformFlags.isNotificationRulesEnabled()) {
      return isDeprecatedNotificationEventName(envelope.eventName);
    }

    if (isDeprecatedNotificationEventName(envelope.eventName)) {
      return true;
    }
    return shouldCreateNotificationEventLog(
      envelope.eventName,
      envelope.data,
    );
  }

  async handle(envelope: EventEnvelope): Promise<void> {
    const warning = getDeprecatedEventEmitWarning(envelope.eventName);
    if (warning) {
      this.logger.warn(
        `Notification bridge received deprecated event; ${warning.message}`,
      );
    }

    const catalogEventName = isDeprecatedNotificationEventName(
      envelope.eventName,
    )
      ? this.catalog.resolveCanonicalEventName(envelope.eventName)
      : envelope.eventName;

    if (
      !isDeprecatedNotificationEventName(envelope.eventName) &&
      !shouldCreateNotificationEventLog(envelope.eventName, envelope.data)
    ) {
      return;
    }

    await this.createNotificationEventLog(envelope, catalogEventName);
  }

  private async createNotificationEventLog(
    envelope: EventEnvelope,
    catalogEventName: string,
  ): Promise<void> {
    this.logger.debug(
      `Notification bridge ${envelope.eventName} → catalog ${catalogEventName}`,
      {
        correlationId: envelope.correlationId,
        tenantId: envelope.tenantId,
      },
    );

    const eventId = await this.catalog.getIdByName(catalogEventName);
    const entityRecord =
      envelope.entity && typeof envelope.entity === 'object'
        ? (envelope.entity as Record<string, unknown>)
        : null;

    const entityId = entityRecord?.entityId ?? entityRecord?.id ?? null;
    const entityType =
      (typeof entityRecord?.entityType === 'string'
        ? entityRecord.entityType
        : null) ??
      (entityRecord?.constructor &&
      typeof entityRecord.constructor === 'function'
        ? (entityRecord.constructor as { name?: string }).name
        : null);

    const dto = plainToInstance(CreateEventLogDto, {
      eventId,
      userId: envelope.userId ?? 1,
      entityId: entityId ?? undefined,
      entityType: entityType ?? undefined,
      externalId: envelope.externalId ?? undefined,
      createdBy: envelope.createdBy ?? envelope.userId ?? 1,
      status: 0,
    });

    const eventLog = await this.logs.create(1, dto, {
      payload: envelope.data,
      eventName: catalogEventName,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId,
      tenantId: envelope.tenantId,
      occurredAt: envelope.occurredAt ?? new Date(),
    });

    this.immediateDispatch.enqueueFromEventLog(eventLog.logId);
  }
}
