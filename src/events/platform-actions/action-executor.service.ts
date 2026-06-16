import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  QueryFailedError,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { plainToInstance } from 'class-transformer';
import jsonLogic from 'json-logic-js';
import type { EventEnvelope } from '../types';
import { EventsService } from '../events.service';
import { EventCatalogService } from '../event-catalog.service';
import { PlatformEventFlagsService } from '../config/platform-event-flags.service';
import type { PlatformEventRecordEntity } from '../platform-bus/entities/platform_event_record.entity';
import { ActionExecutionLogEntity } from './entities/action_execution_log.entity';
import type { PlatformActionEntity } from './entities/platform_action.entity';
import type { ActionBindingEntity } from './entities/action_binding.entity';
import { ActionBindingsService } from './action_bindings.service';
import { NotificationRecipientResolverService } from '../notification-rules/notification-recipient-resolver.service';
import { NotificationImmediateDispatchService } from '../../notifications/services/notification-immediate-dispatch.service';
import { NotificationTemplateEngineService } from '../../notifications/template-engine/notification-template-engine.service';
import { NotificationChannelsService } from '../../notifications/notification_channels/notification_channels.service';
import { NotificationTemplatesService } from '../../notifications/notification_templates/notification_templates.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateNotificationDto } from '../../notifications/dto/create-notification.dto';
import type {
  EmitEventActionConfig,
  SendNotificationActionConfig,
} from './types/platform-action.types';
import {
  parseEmitEventActionConfig,
  parseSendNotificationActionConfig,
} from './types/platform-action.types';
import { isDeprecatedNotificationEventName } from '../constants/platform-event-names.constants';

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    @InjectRepository(ActionExecutionLogEntity)
    private readonly executionLogRepository: Repository<ActionExecutionLogEntity>,
    private readonly eventsService: EventsService,
    private readonly eventCatalog: EventCatalogService,
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly templateEngine: NotificationTemplateEngineService,
    private readonly notificationChannelsService: NotificationChannelsService,
    private readonly notificationTemplatesService: NotificationTemplatesService,
    private readonly notificationsService: NotificationsService,
    private readonly immediateDispatch: NotificationImmediateDispatchService,
  ) {}

  async execute(
    binding: ActionBindingEntity,
    action: PlatformActionEntity,
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<void> {
    const claimed = await this.claimExecution(record.recordId, action.actionId);
    if (!claimed) {
      this.logger.debug(
        `Skipping duplicate action execution action=${action.actionId} record=${record.recordId}`,
      );
      return;
    }

    try {
      const result = await this.runAction(action, envelope, record);
      await this.executionLogRepository.update(
        claimed.executionId,
        {
          status: 'succeeded',
          result,
        } as QueryDeepPartialEntity<ActionExecutionLogEntity>,
      );
      this.logger.debug(
        `Action ${action.actionId} succeeded for binding ${binding.bindingId} (${envelope.eventName})`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown action execution error';
      await this.executionLogRepository.update(claimed.executionId, {
        status: 'failed',
        errorMessage: message.slice(0, 2048),
      });
      this.logger.error(
        `Action ${action.actionId} failed for binding ${binding.bindingId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Runs `emit_event` from a parsed config (shared with process-step actions).
   */
  async executeEmitEventConfig(
    config: EmitEventActionConfig,
    envelope: EventEnvelope,
    causationId?: string | null,
  ): Promise<Record<string, unknown>> {
    await this.eventsService.emitAsync(config.eventName, {
      data: {
        ...(envelope.data &&
        typeof envelope.data === 'object' &&
        !Array.isArray(envelope.data)
          ? (envelope.data as Record<string, unknown>)
          : {}),
        ...(config.data ?? {}),
      },
      tenantId: envelope.tenantId,
      correlationId: envelope.correlationId,
      causationId: causationId ?? envelope.causationId,
      entity: envelope.entity,
      refs: envelope.refs,
      userId: envelope.userId,
      createdBy: envelope.createdBy,
      externalId: envelope.externalId,
    });

    return { eventName: config.eventName };
  }

  /**
   * Runs `send_notification` from a parsed config (shared with process-step actions).
   */
  async executeSendNotificationConfig(
    config: SendNotificationActionConfig,
    envelope: EventEnvelope,
    contextLabel = 'action',
  ): Promise<Record<string, unknown>> {
    const recipientIds = await this.recipientResolver.resolve(
      config.recipientSpec,
      envelope,
    );

    if (recipientIds.length === 0) {
      throw new Error(
        `send_notification ${contextLabel} resolved no recipients`,
      );
    }

    const channel = await this.notificationChannelsService.findOne(
      1,
      config.channelId,
    );
    const template = await this.notificationTemplatesService.findOne(
      1,
      config.templateId,
    );
    const channelType = this.normalizeChannelType(channel.name);
    if (!channelType) {
      throw new Error(`Unsupported channel "${channel.name}"`);
    }

    const eventName = isDeprecatedNotificationEventName(envelope.eventName)
      ? this.eventCatalog.resolveCanonicalEventName(envelope.eventName)
      : envelope.eventName;
    const eventId = await this.eventCatalog.getIdByName(eventName);

    const notificationIds: number[] = [];

    for (const recipientId of recipientIds) {
      const renderResult = await this.templateEngine.renderFromEnvelope(
        envelope,
        recipientId,
        template.subject ?? null,
        template.message,
      );

      const status =
        renderResult.missingRequired.length > 0 ? 'failed' : 'pending';

      const notification = await this.notificationsService.create(
        recipientId,
        plainToInstance(CreateNotificationDto, {
          userId: recipientId,
          eventId,
          type: channelType,
          subject: renderResult.subject,
          message: renderResult.message,
          status,
          scheduledAt: null,
        }),
      );

      notificationIds.push(notification.notificationId);
      this.immediateDispatch.enqueueNotificationSend(notification.notificationId);
    }

    return {
      notificationIds,
      recipientCount: recipientIds.length,
      channelId: config.channelId,
      templateId: config.templateId,
    };
  }

  private async runAction(
    action: PlatformActionEntity,
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<Record<string, unknown>> {
    if (action.actionType === 'emit_event') {
      return this.runEmitEvent(action, envelope, record);
    }
    if (action.actionType === 'send_notification') {
      return this.runSendNotification(action, envelope);
    }
    throw new Error(`Unsupported action type: ${action.actionType}`);
  }

  private async runEmitEvent(
    action: PlatformActionEntity,
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<Record<string, unknown>> {
    const config = parseEmitEventActionConfig(action.config);
    if (!config) {
      throw new Error(`Invalid emit_event config on action ${action.actionId}`);
    }

    return this.executeEmitEventConfig(
      config,
      envelope,
      String(record.recordId),
    );
  }

  private async runSendNotification(
    action: PlatformActionEntity,
    envelope: EventEnvelope,
  ): Promise<Record<string, unknown>> {
    const config = parseSendNotificationActionConfig(action.config);
    if (!config) {
      throw new Error(
        `Invalid send_notification config on action ${action.actionId}`,
      );
    }

    return this.executeSendNotificationConfig(
      config,
      envelope,
      `action ${action.actionId}`,
    );
  }

  private async claimExecution(
    eventRecordId: number,
    actionId: number,
  ): Promise<ActionExecutionLogEntity | null> {
    const existing = await this.executionLogRepository.findOne({
      where: { eventRecordId, actionId },
    });
    if (existing) {
      return null;
    }

    try {
      return await this.executionLogRepository.save(
        this.executionLogRepository.create({
          eventRecordId,
          actionId,
          status: 'pending',
        }),
      );
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return null;
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string };
    return driverError?.code === 'ER_DUP_ENTRY' || driverError?.code === '23505';
  }

  private normalizeChannelType(
    channelName?: string,
  ): CreateNotificationDto['type'] | null {
    if (!channelName) {
      return null;
    }

    const normalized = channelName.toLowerCase().trim();
    if (
      normalized === 'email' ||
      normalized === 'sms' ||
      normalized === 'push' ||
      normalized === 'system'
    ) {
      return normalized;
    }

    return null;
  }
}

@Injectable()
export class ActionBindingEngineService {
  private readonly logger = new Logger(ActionBindingEngineService.name);

  constructor(
    private readonly bindingsService: ActionBindingsService,
    private readonly executor: ActionExecutorService,
    private readonly catalog: EventCatalogService,
    private readonly platformFlags: PlatformEventFlagsService,
  ) {}

  isEnabled(): boolean {
    return this.platformFlags.isActionExecutorEnabled();
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

    const bindings = await this.bindingsService.findActiveBindingsForEvent(
      eventName,
      envelope.tenantId,
    );

    if (bindings.length === 0) {
      this.logger.debug(
        `No action bindings for ${eventName} tenant=${envelope.tenantId ?? 'n/a'}`,
      );
      return;
    }

    for (const binding of bindings) {
      if (!binding.action?.isActive) {
        continue;
      }
      if (!this.matchesFilter(binding, envelope)) {
        continue;
      }

      await this.executor.execute(binding, binding.action, envelope, record);
    }
  }

  private matchesFilter(
    binding: ActionBindingEntity,
    envelope: EventEnvelope,
  ): boolean {
    if (!binding.filterJson || Object.keys(binding.filterJson).length === 0) {
      return true;
    }

    try {
      return Boolean(jsonLogic.apply(binding.filterJson, envelope));
    } catch (error) {
      this.logger.warn(
        `Invalid filter_json on binding ${binding.bindingId}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }
}
