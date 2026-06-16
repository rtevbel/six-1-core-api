const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  'metadata.google.internal',
  'metadata.google',
]);

const PRIVATE_IPV4 =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

function isBlockedWebhookHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(normalized)) {
    return true;
  }

  if (
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.localhost')
  ) {
    return true;
  }

  if (PRIVATE_IPV4.test(normalized)) {
    return true;
  }

  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  return false;
}

function isAllowedWebhookHost(hostname: string, allowedSuffixes: string[]): boolean {
  if (allowedSuffixes.length === 0) {
    return true;
  }

  const normalized = hostname.toLowerCase();
  return allowedSuffixes.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  );
}

/**
 * Validates outbound webhook URLs (protocol + SSRF guard + optional host allowlist).
 */
export function assertWebhookUrlAllowed(
  url: string,
  allowedHostSuffixes: string[],
): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid webhook URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Webhook URL must use http or https.');
  }

  if (!parsed.hostname.trim()) {
    throw new Error('Webhook URL must include a hostname.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedWebhookHostname(hostname)) {
    throw new Error(`Webhook host "${hostname}" is not allowed.`);
  }

  if (!isAllowedWebhookHost(hostname, allowedHostSuffixes)) {
    throw new Error(`Webhook host "${hostname}" is not in the allowlist.`);
  }

  return parsed;
}
