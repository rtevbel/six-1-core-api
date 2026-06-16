import { Injectable } from '@nestjs/common';
import type { EventEnvelope } from '../../types';
import { PlatformEventNotificationBridgeService } from '../../platform-event-notification-bridge.service';
import type { PlatformEventRecordEntity } from '../entities/platform_event_record.entity';
import type { PlatformEventConsumer } from '../interfaces/platform-event-consumer.interface';
import { AutomationEventHandlerService } from '../../../automation/automation-event-handler.service';
import { NotificationRuleEngineService } from '../../notification-rules/notification-rule-engine.service';
import { ActionBindingEngineService } from '../../platform-actions/action-executor.service';
import { ProcessStartRuleEngineService } from '../../../automation/process-start-rules/process-start-rule-engine.service';

@Injectable()
export class AutomationEventConsumer implements PlatformEventConsumer {
  readonly name = 'AutomationEventConsumer';

  constructor(private readonly handler: AutomationEventHandlerService) {}

  canHandle(envelope: EventEnvelope): boolean {
    return this.handler.canHandle(envelope);
  }

  async handle(
    envelope: EventEnvelope,
    _record: PlatformEventRecordEntity,
  ): Promise<void> {
    await this.handler.handle(envelope);
  }
}

@Injectable()
export class NotificationRuleConsumer implements PlatformEventConsumer {
  readonly name = 'NotificationRuleConsumer';

  constructor(private readonly ruleEngine: NotificationRuleEngineService) {}

  canHandle(envelope: EventEnvelope): boolean {
    return this.ruleEngine.canHandle(envelope);
  }

  async handle(
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<void> {
    await this.ruleEngine.process(envelope, record);
  }
}

@Injectable()
export class ActionBindingConsumer implements PlatformEventConsumer {
  readonly name = 'ActionBindingConsumer';

  constructor(private readonly actionEngine: ActionBindingEngineService) {}

  canHandle(envelope: EventEnvelope): boolean {
    return this.actionEngine.canHandle(envelope);
  }

  async handle(
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<void> {
    await this.actionEngine.process(envelope, record);
  }
}

@Injectable()
export class ProcessStartRuleConsumer implements PlatformEventConsumer {
  readonly name = 'ProcessStartRuleConsumer';

  constructor(private readonly engine: ProcessStartRuleEngineService) {}

  canHandle(envelope: EventEnvelope): boolean {
    return this.engine.canHandle(envelope);
  }

  async handle(
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<void> {
    await this.engine.process(envelope, record);
  }
}

@Injectable()
export class PlatformEventNotificationBridgeConsumer
  implements PlatformEventConsumer
{
  readonly name = 'PlatformEventNotificationBridgeConsumer';

  constructor(
    private readonly bridge: PlatformEventNotificationBridgeService,
  ) {}

  canHandle(envelope: EventEnvelope): boolean {
    return this.bridge.shouldHandle(envelope);
  }

  async handle(
    envelope: EventEnvelope,
    _record: PlatformEventRecordEntity,
  ): Promise<void> {
    await this.bridge.handle(envelope);
  }
}
