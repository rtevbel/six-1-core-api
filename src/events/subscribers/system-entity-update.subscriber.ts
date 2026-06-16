import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';
import { SystemEntityEventEmitterService } from '../system-entity-event-emitter.service';
import { resolveSystemEntityUpdateFromEvent } from '../system-entity-update-event.util';

/**
 * Observes `system_table` entity updates and emits canonical domain events (P5).
 */
@Injectable()
export class SystemEntityUpdateSubscriber
  implements EntitySubscriberInterface
{
  private readonly logger = new Logger(SystemEntityUpdateSubscriber.name);

  constructor(
    dataSource: DataSource,
    private readonly systemEntityEventEmitter: SystemEntityEventEmitterService,
  ) {
    dataSource.subscribers.push(this);
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    const resolved = resolveSystemEntityUpdateFromEvent(event);
    if (!resolved) {
      return;
    }

    this.logger.debug(
      `System entity updated objectType=${resolved.objectType} entityId=${resolved.entityId}`,
      { changedFields: resolved.changedFields },
    );

    this.systemEntityEventEmitter.emitUpdated(resolved);
  }
}
