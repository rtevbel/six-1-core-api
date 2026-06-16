import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { PlatformEventRecordsService } from './platform-event-records.service';
import type { EventTimelineFiltersDto } from './dto/platform-event-audit-filters.dto';
import type {
  ActionExecutionTimelineEntry,
  EventTimelineEntry,
  EventTimelineResult,
  NotificationDeliveryTimelineEntry,
  NotificationDispatchTimelineEntry,
  PlatformEventTimelineEntry,
} from './interfaces/event-timeline.interface';
import { ActionExecutionLogEntity } from '../platform-actions/entities/action_execution_log.entity';
import { EventLogEntity } from '../event_logs/entities/event_log.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { NotificationLogEntity } from '../../notifications/notification_logs/entities/notification_log.entity';
import { readRuleDispatchFromPayload } from '../notification-rules/event-log-platform-payload.util';

const DEFAULT_TIMELINE_LIMIT = 200;

@Injectable()
export class PlatformEventTimelineService {
  constructor(
    private readonly recordsService: PlatformEventRecordsService,
    @InjectRepository(ActionExecutionLogEntity)
    private readonly executionRepository: Repository<ActionExecutionLogEntity>,
    @InjectRepository(EventLogEntity)
    private readonly eventLogRepository: Repository<EventLogEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly notificationLogRepository: Repository<NotificationLogEntity>,
  ) {}

  async getTimeline(
    filters: EventTimelineFiltersDto,
  ): Promise<EventTimelineResult> {
    this.assertTimelineScope(filters);

    const limit = Math.min(filters.limit ?? DEFAULT_TIMELINE_LIMIT, 500);
    const recordFilters = {
      correlationId: filters.correlationId,
      tenantId: filters.tenantId,
      entityType: filters.entityType,
      entityId: filters.entityId,
      occurredAfter: filters.occurredAfter,
      occurredBefore: filters.occurredBefore,
    };

    const records = await this.recordsService.findForTimeline(
      recordFilters,
      limit,
    );

    const correlationId =
      filters.correlationId?.trim() ??
      records.find((record) => record.correlationId)?.correlationId ??
      undefined;

    const recordIds = records.map((record) => record.recordId);

    const [
      actionExecutions,
      dispatchLogs,
      directNotificationIds,
    ] = await Promise.all([
      this.loadActionExecutions(recordIds, limit),
      correlationId
        ? this.loadNotificationDispatches(correlationId, limit)
        : Promise.resolve([]),
      this.loadDirectNotificationIds(recordIds),
    ]);

    const notificationIds = new Set<number>(directNotificationIds);
    for (const dispatch of dispatchLogs) {
      const matches = await this.findNotificationsForDispatch(dispatch);
      for (const id of matches) {
        notificationIds.add(id);
      }
    }

    const deliveries = await this.loadNotificationDeliveries(
      [...notificationIds],
      limit,
    );

    const platformEntries: PlatformEventTimelineEntry[] = records.map(
      (record) => ({
        kind: 'platform_event',
        occurredAt: record.occurredAt.toISOString(),
        recordId: record.recordId,
        eventName: record.eventName,
        tenantId: record.tenantId,
        correlationId: record.correlationId,
        causationId: record.causationId,
        entityType: record.entityType,
        entityId: record.entityId,
        status: record.status,
        payload: record.payload,
      }),
    );

    const actionEntries: ActionExecutionTimelineEntry[] =
      actionExecutions.map((execution) => ({
        kind: 'action_execution',
        occurredAt: execution.createdAt.toISOString(),
        executionId: execution.executionId,
        eventRecordId: execution.eventRecordId,
        actionId: execution.actionId,
        actionName: execution.action?.name,
        actionType: execution.action?.actionType,
        status: execution.status,
        result: execution.result,
        errorMessage: execution.errorMessage,
        parentEventName: execution.eventRecord?.eventName,
      }));

    const dispatchEntries: NotificationDispatchTimelineEntry[] =
      dispatchLogs.map((log) => {
        const payload =
          log.payload && typeof log.payload === 'object'
            ? (log.payload as Record<string, unknown>)
            : {};
        const dispatch = readRuleDispatchFromPayload(payload);

        return {
          kind: 'notification_dispatch',
          occurredAt: log.createdAt.toISOString(),
          eventLogId: log.logId,
          userId: log.userId,
          eventId: log.eventId,
          eventName:
            typeof payload.eventName === 'string'
              ? payload.eventName
              : log.event?.name,
          channelId: dispatch?.channelId,
          templateId: dispatch?.templateId,
          ruleId: dispatch?.ruleId,
        };
      });

    const deliveryEntries: NotificationDeliveryTimelineEntry[] =
      deliveries.map((row) => ({
        kind: 'notification_delivery',
        occurredAt: (row.deliveredAt ?? row.createdAt).toISOString(),
        notificationId: row.notificationId,
        userId: row.userId,
        type: row.type,
        status: row.status,
        logId: row.logId,
        deliveryStatus: row.deliveryStatus,
        channelId: row.channelId,
      }));

    const entries = this.sortTimelineEntries([
      ...platformEntries,
      ...actionEntries,
      ...dispatchEntries,
      ...deliveryEntries,
    ]);

    return {
      correlationId,
      tenantId: filters.tenantId,
      entityType: filters.entityType,
      entityId: filters.entityId,
      entries: entries.slice(0, limit),
      summary: {
        platformEventCount: platformEntries.length,
        actionExecutionCount: actionEntries.length,
        notificationDispatchCount: dispatchEntries.length,
        notificationDeliveryCount: deliveryEntries.length,
      },
    };
  }

  private sortTimelineEntries(
    entries: EventTimelineEntry[],
  ): EventTimelineEntry[] {
    return [...entries].sort((left, right) => {
      const timeDelta =
        new Date(left.occurredAt).getTime() -
        new Date(right.occurredAt).getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return left.kind.localeCompare(right.kind);
    });
  }

  private async loadActionExecutions(
    recordIds: number[],
    limit: number,
  ): Promise<ActionExecutionLogEntity[]> {
    if (recordIds.length === 0) {
      return [];
    }

    return this.executionRepository.find({
      where: { eventRecordId: In(recordIds) },
      relations: ['action', 'eventRecord'],
      order: { createdAt: 'ASC', executionId: 'ASC' },
      take: limit,
    });
  }

  private async loadNotificationDispatches(
    correlationId: string,
    limit: number,
  ): Promise<EventLogEntity[]> {
    return this.eventLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.event', 'event')
      .where(
        `JSON_UNQUOTE(JSON_EXTRACT(log.payload, '$.correlationId')) = :correlationId`,
        { correlationId },
      )
      .orderBy('log.createdAt', 'ASC')
      .addOrderBy('log.logId', 'ASC')
      .take(limit)
      .getMany();
  }

  private async loadDirectNotificationIds(
    recordIds: number[],
  ): Promise<number[]> {
    if (recordIds.length === 0) {
      return [];
    }

    const executions = await this.executionRepository.find({
      where: { eventRecordId: In(recordIds), status: 'succeeded' },
      select: ['result'],
    });

    const ids: number[] = [];
    for (const execution of executions) {
      const result = execution.result;
      if (!result || !Array.isArray(result.notificationIds)) {
        continue;
      }
      for (const rawId of result.notificationIds) {
        const parsed = Number(rawId);
        if (Number.isFinite(parsed) && parsed > 0) {
          ids.push(parsed);
        }
      }
    }

    return ids;
  }

  private async findNotificationsForDispatch(
    log: EventLogEntity,
  ): Promise<number[]> {
    const rows = await this.notificationRepository.find({
      where: {
        eventId: log.eventId,
        userId: log.userId,
      },
      select: ['notificationId'],
      order: { createdAt: 'ASC' },
      take: 5,
    });

    return rows.map((row) => row.notificationId);
  }

  private async loadNotificationDeliveries(
    notificationIds: number[],
    limit: number,
  ): Promise<
    Array<{
      notificationId: number;
      userId: number;
      type: string;
      status: string;
      createdAt: Date;
      logId?: number;
      deliveryStatus?: string;
      channelId?: number;
      deliveredAt?: Date;
    }>
  > {
    if (notificationIds.length === 0) {
      return [];
    }

    const notifications = await this.notificationRepository.find({
      where: { notificationId: In(notificationIds) },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    const logs = await this.notificationLogRepository.find({
      where: { notificationId: In(notificationIds) },
      order: { createdAt: 'ASC' },
    });

    const logsByNotification = new Map<number, NotificationLogEntity[]>();
    for (const log of logs) {
      const bucket = logsByNotification.get(log.notificationId) ?? [];
      bucket.push(log);
      logsByNotification.set(log.notificationId, bucket);
    }

    const rows: Array<{
      notificationId: number;
      userId: number;
      type: string;
      status: string;
      createdAt: Date;
      logId?: number;
      deliveryStatus?: string;
      channelId?: number;
      deliveredAt?: Date;
    }> = [];

    for (const notification of notifications) {
      const deliveryLogs =
        logsByNotification.get(notification.notificationId) ?? [];

      if (deliveryLogs.length === 0) {
        rows.push({
          notificationId: notification.notificationId,
          userId: notification.userId,
          type: notification.type,
          status: notification.status,
          createdAt: notification.createdAt,
        });
        continue;
      }

      for (const log of deliveryLogs) {
        rows.push({
          notificationId: notification.notificationId,
          userId: notification.userId,
          type: notification.type,
          status: notification.status,
          createdAt: notification.createdAt,
          logId: log.logId,
          deliveryStatus: log.status,
          channelId: log.channelId,
          deliveredAt: log.createdAt,
        });
      }
    }

    return rows;
  }

  private assertTimelineScope(filters: EventTimelineFiltersDto): void {
    const hasCorrelation = Boolean(filters.correlationId?.trim());
    const hasEntity =
      filters.tenantId != null &&
      Boolean(filters.entityType?.trim()) &&
      filters.entityId != null;
    const hasTime =
      filters.occurredAfter != null || filters.occurredBefore != null;

    if (!hasCorrelation && !hasEntity && !hasTime) {
      throw new RpcException(
        'Provide correlationId, tenantId+entityType+entityId, or a time range',
      );
    }
  }
}
