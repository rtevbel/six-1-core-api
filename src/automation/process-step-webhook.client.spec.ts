import { ProcessWebhookConfigService } from './config/process-webhook-config.service';
import { ProcessStepWebhookClient } from './process-step-webhook.client';

describe('ProcessStepWebhookClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createClient(enabled = true) {
    const webhookConfig = {
      isEnabled: jest.fn().mockReturnValue(enabled),
      getSettings: jest.fn().mockReturnValue({
        enabled,
        defaultTimeoutMs: 5_000,
        allowedHostSuffixes: [],
      }),
    } as unknown as ProcessWebhookConfigService;

    return {
      client: new ProcessStepWebhookClient(webhookConfig),
      webhookConfig,
    };
  }

  it('throws when webhooks are disabled', async () => {
    const { client } = createClient(false);

    await expect(
      client.invoke({
        url: 'https://api.partner.io/hook',
        method: 'POST',
        tenantId: 1,
      }),
    ).rejects.toThrow('disabled');
  });

  it('posts JSON payload with tenant headers', async () => {
    const { client } = createClient();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    }) as unknown as typeof fetch;

    const result = await client.invoke({
      url: 'https://api.partner.io/hook',
      method: 'POST',
      body: { customerId: 7 },
      tenantId: 1,
      correlationId: 'corr-1',
    });

    expect(result).toMatchObject({
      statusCode: 200,
      ok: true,
      responseBodyPreview: '{"ok":true}',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.partner.io/hook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-SIX1-Tenant-Id': '1',
          'X-SIX1-Correlation-Id': 'corr-1',
        }),
        body: JSON.stringify({ customerId: 7 }),
      }),
    );
  });

  it('throws structured failure on non-2xx responses', async () => {
    const { client } = createClient();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'service unavailable',
    }) as unknown as typeof fetch;

    await expect(
      client.invoke({
        url: 'https://api.partner.io/hook',
        method: 'POST',
        tenantId: 1,
      }),
    ).rejects.toThrow('HTTP 503');
  });
});
