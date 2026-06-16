import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  loadPlatformEventFlags,
  type PlatformEventFlags,
} from './platform-event.config';

/**
 * Reads platform event rollout flags from configuration.
 */
@Injectable()
export class PlatformEventFlagsService {
  private readonly flags: PlatformEventFlags;

  constructor(private readonly configService: ConfigService) {
    this.flags = loadPlatformEventFlags(this.configService);
  }

  getAll(): Readonly<PlatformEventFlags> {
    return this.flags;
  }

  getEnvelopeValidationMode(): PlatformEventFlags['envelopeValidation'] {
    return this.flags.envelopeValidation;
  }

  isEnvelopeValidationEnabled(): boolean {
    return this.flags.envelopeValidation !== 'off';
  }

  isEnvelopeValidationStrict(): boolean {
    return this.flags.envelopeValidation === 'strict';
  }

  isEventBusEnabled(): boolean {
    return this.flags.eventBusEnabled;
  }

  isNotificationRulesEnabled(): boolean {
    return this.flags.notificationRulesEnabled;
  }

  isActionExecutorEnabled(): boolean {
    return this.flags.actionExecutorEnabled;
  }

  getEventRecordRetentionDays(): number | undefined {
    return this.flags.eventRecordRetentionDays;
  }
}
