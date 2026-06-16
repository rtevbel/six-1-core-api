import { Injectable, Logger } from '@nestjs/common';
import { EventsService } from './events.service';
import { PLATFORM_EVENT_NAMES } from './constants/platform-event-names.constants';
import {
  buildSystemEntityUpdatedEventOptions,
  type SystemEntityUpdatedEventContext,
} from './platform-config-object-event.util';
import { isSystemTableObjectType } from '../config_objects/object-catalog-scope';

/**
 * Emits `six1-event.system_entity.updated` for allowlisted `system_table` writes.
 *
 * Domain modules may call this directly; {@link SystemEntityUpdateSubscriber}
 * also invokes it for `repository.save` update paths.
 */
@Injectable()
export class SystemEntityEventEmitterService {
  private readonly logger = new Logger(SystemEntityEventEmitterService.name);

  constructor(private readonly eventsService: EventsService) {}

  emitUpdated(ctx: SystemEntityUpdatedEventContext): void {
    if (!isSystemTableObjectType(ctx.objectType)) {
      this.logger.warn(
        `Skipping ${PLATFORM_EVENT_NAMES.SYSTEM_ENTITY_UPDATED} — objectType ${ctx.objectType} is not system_table`,
      );
      return;
    }

    if (!ctx.changedFields.length) {
      return;
    }

    this.eventsService.emit(
      PLATFORM_EVENT_NAMES.SYSTEM_ENTITY_UPDATED,
      buildSystemEntityUpdatedEventOptions(ctx),
    );
  }
}
