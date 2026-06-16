import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  loadProcessWebhookSettings,
  type ProcessWebhookSettings,
} from './process-webhook.config';

/** Reads process-step webhook settings from configuration. */
@Injectable()
export class ProcessWebhookConfigService {
  private readonly settings: ProcessWebhookSettings;

  constructor(private readonly configService: ConfigService) {
    this.settings = loadProcessWebhookSettings(this.configService);
  }

  getSettings(): Readonly<ProcessWebhookSettings> {
    return this.settings;
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }
}
