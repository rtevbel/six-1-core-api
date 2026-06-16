import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLogEntity } from '../event_logs/entities/event_log.entity';
import { PLATFORM_EVENT_NOTIFICATION_DEDUP_WINDOW_MINUTES_KEY } from '../config/platform-event.constants';

const DEFAULT_DEDUP_WINDOW_MINUTES = 5;

@Injectable()
export class NotificationDispatchDedupService {
  private readonly windowMs: number;

  constructor(
    @InjectRepository(EventLogEntity)
    private readonly eventLogRepository: Repository<EventLogEntity>,
    configService: ConfigService,
  ) {
    const raw = configService.get<string>(
      PLATFORM_EVENT_NOTIFICATION_DEDUP_WINDOW_MINUTES_KEY,
    );
    const minutes = raw ? Number(raw) : DEFAULT_DEDUP_WINDOW_MINUTES;
    this.windowMs =
      (Number.isFinite(minutes) && minutes > 0
        ? minutes
        : DEFAULT_DEDUP_WINDOW_MINUTES) *
      60 *
      1000;
  }

  buildDispatchKey(
    userId: number,
    eventId: number,
    correlationId?: string,
  ): string {
    return `${userId}:${eventId}:${correlationId ?? ''}`;
  }

  /**
   * Returns true when an unprocessed dispatch already exists within the dedup window.
   */
  async hasRecentDispatch(
    userId: number,
    eventId: number,
    correlationId?: string,
  ): Promise<boolean> {
    const since = new Date(Date.now() - this.windowMs);
    const qb = this.eventLogRepository
      .createQueryBuilder('el')
      .where('el.user_id = :userId', { userId })
      .andWhere('el.event_id = :eventId', { eventId })
      .andWhere('el.status = 0')
      .andWhere('el.created_at >= :since', { since });

    if (correlationId) {
      qb.andWhere(
        `JSON_UNQUOTE(JSON_EXTRACT(el.payload, '$.correlationId')) = :correlationId`,
        { correlationId },
      );
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
