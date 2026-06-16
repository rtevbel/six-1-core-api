import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { EventEnvelope } from '../events/types';
import { AutomationEventHandlerService } from './automation-event-handler.service';
import { PlatformEventFlagsService } from '../events/config/platform-event-flags.service';

/**
 * Legacy EventEmitter2 bridge — active only when the platform bus flag is off.
 * @deprecated Prefer {@link PlatformEventBusService} (P1).
 */
@Injectable()
export class AutomationEventBridgeListener {
  private readonly logger = new Logger(AutomationEventBridgeListener.name);

  constructor(
    private readonly handler: AutomationEventHandlerService,
    private readonly platformFlags: PlatformEventFlagsService,
  ) {}

  @OnEvent('six1-event.*', { async: true })
  async onPlatformEvent(payload: EventEnvelope): Promise<void> {
    if (this.platformFlags.isEventBusEnabled()) {
      return;
    }
    await this.handler.handle(payload);
  }
}
