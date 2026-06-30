import { Injectable, Logger } from '@nestjs/common';
import { applyJsonLogicRule } from '../../common/json-logic/json-logic-rule.util';
import { plainToInstance } from 'class-transformer';
import type { EventEnvelope } from '../types';
import { EventCatalogService } from '../event-catalog.service';
import { EventLogsService } from '../event_logs/event_logs.service';
import { CreateEventLogDto } from '../event_logs/dto/create-event_log.dto';
import { EventNotificationRulesService } from '../event_notification_rules/event_notification_rules.service';
import type { EventNotificationRuleEntity } from '../event_notification_rules/entities/event_notification_rule.entity';
import type { PlatformEventRecordEntity } from '../platform-bus/entities/platform_event_record.entity';
import { PlatformEventFlagsService } from '../config/platform-event-flags.service';
import { NotificationRecipientResolverService } from './notification-recipient-resolver.service';
import { NotificationDispatchDedupService } from './notification-dispatch-dedup.service';
import { buildRuleDispatchEventLogPayload } from './event-log-platform-payload.util';
import { normalizeEntityRef } from '../types';
import { parseOptionalPositiveInt } from '../../notifications/context/notification-context-source.util';
import {
  isDeprecatedNotificationEventName,
} from '../constants/platform-event-names.constants';
import { NotificationImmediateDispatchService } from '../../notifications/services/notification-immediate-dispatch.service';

@Injectable()
export class NotificationRuleEngineService {
  private readonly logger = new Logger(NotificationRuleEngineService.name);

  constructor(
    private readonly rulesService: EventNotificationRulesService,
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly dedup: NotificationDispatchDedupService,
    private readonly eventLogsService: EventLogsService,
    private readonly catalog: EventCatalogService,
    private readonly platformFlags: PlatformEventFlagsService,
    private readonly immediateDispatch: NotificationImmediateDispatchService,
  ) {}

  isEnabled(): boolean {
    return this.platformFlags.isNotificationRulesEnabled();
  }

  canHandle(envelope: EventEnvelope): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return envelope.eventName.startsWith('six1-event.');
  }

  async process(
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<void> {
    if (!this.canHandle(envelope)) {
      return;
    }

    const eventName = isDeprecatedNotificationEventName(envelope.eventName)
      ? this.catalog.resolveCanonicalEventName(envelope.eventName)
      : envelope.eventName;

    const rules = await this.rulesService.findActiveRulesForEvent(
      eventName,
      envelope.tenantId,
    );

    if (rules.length === 0) {
      this.logger.debug(
        `No notification rules for ${eventName} tenant=${envelope.tenantId ?? 'n/a'}`,
      );
      return;
    }

    const dispatchedInBatch = new Set<string>();

    for (const rule of rules) {
      if (!this.matchesFilter(rule, envelope)) {
        continue;
      }

      const deliveryTargets = await this.recipientResolver.resolveDeliveryTargets(
        rule.recipientSpec,
        envelope,
      );

      if (deliveryTargets.length === 0) {
        this.logger.warn(
          `Rule ${rule.ruleId} matched ${eventName} but resolved no recipients`,
        );
        continue;
      }

      const eventId = await this.catalog.getIdByName(eventName);
      const entityRef = normalizeEntityRef(envelope.entity);

      for (const target of deliveryTargets) {
        const recipientId = target.userId;
        const dedupKey = this.dedup.buildDispatchKey(
          recipientId,
          eventId,
          envelope.correlationId,
        );

        if (dispatchedInBatch.has(dedupKey)) {
          continue;
        }

        const isDuplicate = await this.dedup.hasRecentDispatch(
          recipientId,
          eventId,
          envelope.correlationId,
        );
        if (isDuplicate) {
          this.logger.debug(
            `Skipping duplicate dispatch user=${recipientId} event=${eventName} correlation=${envelope.correlationId ?? 'n/a'}`,
          );
          continue;
        }

        dispatchedInBatch.add(dedupKey);

        await this.createDispatchEventLog({
          envelope,
          eventName,
          eventId,
          recipientId,
          destinationEmail: target.destinationEmail,
          rule,
          record,
          entityRef,
        });
      }
    }
  }

  private matchesFilter(
    rule: EventNotificationRuleEntity,
    envelope: EventEnvelope,
  ): boolean {
    if (!rule.filterJson || Object.keys(rule.filterJson).length === 0) {
      return true;
    }

    try {
      return applyJsonLogicRule(rule.filterJson, envelope);
    } catch (error) {
      this.logger.warn(
        `Invalid filter_json on rule ${rule.ruleId}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private async createDispatchEventLog(params: {
    envelope: EventEnvelope;
    eventName: string;
    eventId: number;
    recipientId: number;
    destinationEmail?: string;
    rule: EventNotificationRuleEntity;
    record: PlatformEventRecordEntity;
    entityRef: ReturnType<typeof normalizeEntityRef>;
  }): Promise<void> {
    const {
      envelope,
      eventName,
      eventId,
      recipientId,
      destinationEmail,
      rule,
      record,
      entityRef,
    } = params;

    const customerCoreId = this.resolveCustomerCoreId(envelope);

    const dto = plainToInstance(CreateEventLogDto, {
      eventId,
      userId: recipientId,
      entityId:
        customerCoreId ??
        (entityRef?.entityId != null ? Number(entityRef.entityId) : undefined),
      entityType: customerCoreId ? 'customer' : entityRef?.entityType ?? undefined,
      externalId: envelope.externalId ?? undefined,
      createdBy: envelope.createdBy ?? envelope.userId ?? 1,
      status: 0,
    });

    const payload = buildRuleDispatchEventLogPayload(envelope, eventName, {
      ruleId: rule.ruleId,
      channelId: rule.channelId,
      templateId: rule.templateId,
      ...(destinationEmail ? { destinationEmail } : {}),
    });

    const eventLog = await this.eventLogsService.create(1, dto, {
      ...payload,
      causationId: String(record.recordId),
    });

    this.immediateDispatch.enqueueFromEventLog(eventLog.logId);

    this.logger.debug(
      `Rule ${rule.ruleId} dispatched event_log for user ${recipientId} (${eventName})`,
    );
  }

  private resolveCustomerCoreId(envelope: EventEnvelope): number | undefined {
    const data =
      envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
        ? (envelope.data as Record<string, unknown>)
        : {};
    const context =
      data.context && typeof data.context === 'object' && !Array.isArray(data.context)
        ? (data.context as Record<string, unknown>)
        : {};

    return (
      parseOptionalPositiveInt(envelope.refs?.customerCoreId) ??
      parseOptionalPositiveInt(data.customerCoreId) ??
      parseOptionalPositiveInt(data.customer_core_id) ??
      parseOptionalPositiveInt(context.customerId) ??
      parseOptionalPositiveInt(context.customer_id) ??
      undefined
    );
  }
}
