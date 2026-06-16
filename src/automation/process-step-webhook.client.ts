import { Injectable, Logger } from '@nestjs/common';
import { ProcessWebhookConfigService } from './config/process-webhook-config.service';
import { assertWebhookUrlAllowed } from './process-step-webhook-url.util';

const RESPONSE_BODY_PREVIEW_LIMIT = 1024;
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export interface ProcessStepWebhookInvokeParams {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
  tenantId: number;
  correlationId?: string | null;
}

export interface ProcessStepWebhookInvokeResult {
  url: string;
  method: string;
  statusCode: number;
  ok: boolean;
  responseBodyPreview: string | null;
}

/**
 * Outbound HTTP client for process-step `call_webhook` actions (C6).
 */
@Injectable()
export class ProcessStepWebhookClient {
  private readonly logger = new Logger(ProcessStepWebhookClient.name);

  constructor(private readonly webhookConfig: ProcessWebhookConfigService) {}

  async invoke(
    params: ProcessStepWebhookInvokeParams,
  ): Promise<ProcessStepWebhookInvokeResult> {
    if (!this.webhookConfig.isEnabled()) {
      throw new Error('Process step webhooks are disabled.');
    }

    const settings = this.webhookConfig.getSettings();
    const parsedUrl = assertWebhookUrlAllowed(
      params.url,
      settings.allowedHostSuffixes,
    );
    const method = params.method ?? 'POST';
    const timeoutMs = params.timeoutMs ?? settings.defaultTimeoutMs;

    const headers: Record<string, string> = {
      'User-Agent': 'six1-core-api/process-step-webhook',
      'X-SIX1-Tenant-Id': String(params.tenantId),
      ...(params.correlationId
        ? { 'X-SIX1-Correlation-Id': params.correlationId }
        : {}),
      ...(params.headers ?? {}),
    };

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    };

    if (METHODS_WITH_BODY.has(method)) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      init.body = JSON.stringify(params.body ?? {});
    }

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), init);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new Error(`Webhook request timed out after ${timeoutMs}ms.`);
      }
      const message =
        error instanceof Error ? error.message : 'Webhook request failed.';
      throw new Error(message);
    }

    const responseBodyPreview = await this.readResponsePreview(response);
    const result: ProcessStepWebhookInvokeResult = {
      url: parsedUrl.toString(),
      method,
      statusCode: response.status,
      ok: response.ok,
      responseBodyPreview,
    };

    if (!response.ok) {
      this.logger.warn(
        `Webhook ${method} ${parsedUrl.hostname} returned HTTP ${response.status}`,
      );
      throw new Error(
        `Webhook request failed with HTTP ${response.status}${
          responseBodyPreview ? `: ${responseBodyPreview.slice(0, 256)}` : ''
        }`,
      );
    }

    this.logger.debug(
      `Webhook ${method} ${parsedUrl.hostname} succeeded with HTTP ${response.status}`,
    );
    return result;
  }

  private async readResponsePreview(response: Response): Promise<string | null> {
    try {
      const text = await response.text();
      if (!text) {
        return null;
      }
      return text.length > RESPONSE_BODY_PREVIEW_LIMIT
        ? text.slice(0, RESPONSE_BODY_PREVIEW_LIMIT)
        : text;
    } catch {
      return null;
    }
  }
}
