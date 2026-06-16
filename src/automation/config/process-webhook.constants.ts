/** Env keys for process-step `call_webhook` rollout. */
export const PROCESS_STEP_WEBHOOK_ENABLED_KEY = 'PROCESS_STEP_WEBHOOK_ENABLED';

export const PROCESS_STEP_WEBHOOK_DEFAULT_TIMEOUT_MS_KEY =
  'PROCESS_STEP_WEBHOOK_DEFAULT_TIMEOUT_MS';

/**
 * Comma-separated host suffixes (e.g. `hooks.example.com,api.partner.io`).
 * When empty, only SSRF/private-network guards apply.
 */
export const PROCESS_STEP_WEBHOOK_ALLOWED_HOST_SUFFIXES_KEY =
  'PROCESS_STEP_WEBHOOK_ALLOWED_HOST_SUFFIXES';

export const DEFAULT_PROCESS_STEP_WEBHOOK_TIMEOUT_MS = 15_000;
