import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { EventEnvelope } from '../types';
import { normalizeEntityRef } from '../types';
import { PlatformEventRecordEntity } from './entities/platform_event_record.entity';
import {
  PLATFORM_EVENT_CONSUMERS,
  type PlatformEventConsumer,
} from './interfaces/platform-event-consumer.interface';

@Injectable()
export class PlatformEventBusService {
  private readonly logger = new Logger(PlatformEventBusService.name);

  constructor(
    @InjectRepository(PlatformEventRecordEntity)
    private readonly recordRepository: Repository<PlatformEventRecordEntity>,
    @Inject(PLATFORM_EVENT_CONSUMERS)
    private readonly consumers: PlatformEventConsumer[],
  ) {}

  /**
   * Persists the envelope and fans out to registered consumers (P1).
   */
  async publish(envelope: EventEnvelope): Promise<PlatformEventRecordEntity> {
    const record = await this.persistRecord(envelope);

    try {
      for (const consumer of this.consumers) {
        if (!consumer.canHandle(envelope)) {
          continue;
        }
        await consumer.handle(envelope, record);
      }
      record.status = 'dispatched';
      await this.recordRepository.update(record.recordId, { status: 'dispatched' });
    } catch (error) {
      record.status = 'failed';
      await this.recordRepository.update(record.recordId, { status: 'failed' });
      this.logger.error(
        `Platform event consumer failed for ${envelope.eventName}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    return record;
  }

  private async persistRecord(
    envelope: EventEnvelope,
  ): Promise<PlatformEventRecordEntity> {
    const entityRef = normalizeEntityRef(envelope.entity);
    const entityId =
      entityRef?.entityId != null && !Number.isNaN(Number(entityRef.entityId))
        ? Number(entityRef.entityId)
        : null;
    const tenantId =
      envelope.tenantId != null && envelope.tenantId !== ''
        ? Number(envelope.tenantId)
        : null;

    const row = this.recordRepository.create({
      eventName: envelope.eventName,
      tenantId: Number.isFinite(tenantId) ? tenantId : null,
      correlationId: envelope.correlationId ?? null,
      causationId: envelope.causationId ?? null,
      entityType: entityRef?.entityType ?? null,
      entityId,
      payload:
        envelope.data && typeof envelope.data === 'object'
          ? (envelope.data as Record<string, unknown>)
          : null,
      status: 'recorded',
      occurredAt: envelope.occurredAt ?? new Date(),
    });

    return this.recordRepository.save(row);
  }
}
