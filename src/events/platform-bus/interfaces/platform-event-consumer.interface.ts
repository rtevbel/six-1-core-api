import type { EventEnvelope } from '../../types';
import type { PlatformEventRecordEntity } from '../entities/platform_event_record.entity';

export interface PlatformEventConsumer {
  /** Consumer label for logs. */
  readonly name: string;

  canHandle(envelope: EventEnvelope): boolean;

  handle(
    envelope: EventEnvelope,
    record: PlatformEventRecordEntity,
  ): Promise<void>;
}

export const PLATFORM_EVENT_CONSUMERS = Symbol('PLATFORM_EVENT_CONSUMERS');
