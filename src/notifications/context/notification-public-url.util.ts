import { ConfigService } from '@nestjs/config';
import {
  LOCAL_PUBLIC_BASE_URL,
  NOTIFICATION_PUBLIC_BASE_URL_KEY,
} from '../../common/constants';

/**
 * Resolves the public base URL used for notification deep links.
 */
export function getNotificationPublicBaseUrl(
  configService: ConfigService,
): string | null {
  const notificationBaseUrl = configService.get<string>(
    NOTIFICATION_PUBLIC_BASE_URL_KEY,
  );
  const fallbackBaseUrl =
    configService.get<string>(LOCAL_PUBLIC_BASE_URL) ?? null;
  const baseUrl = notificationBaseUrl ?? fallbackBaseUrl;

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/+$/, '');
}

/**
 * Builds an absolute URL from a path segment (e.g. `/process-instances/1/runner`).
 */
export function buildNotificationPublicUrl(
  configService: ConfigService,
  path: string,
): string | null {
  const base = getNotificationPublicBaseUrl(configService);
  if (!base) {
    return null;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
