import { resolveVerificationUrlPath } from './config-object-verification-url.registry';

/**
 * Frontend path segment for generic config-object email verification links.
 * @deprecated Prefer {@link resolveVerificationUrlPath} via the registry.
 */
export function verificationUrlPathForObjectType(objectType: string): string {
  return resolveVerificationUrlPath(objectType);
}

/**
 * Builds an absolute verification URL for a config object type and token.
 */
export function buildConfigObjectVerificationUrl(
  baseUrl: string | null,
  objectType: string,
  token: string,
  registry?: Record<string, string> | null,
): string | null {
  return buildConfigObjectVerificationUrlWithPath(
    baseUrl,
    resolveVerificationUrlPath(objectType, registry),
    token,
  );
}

/**
 * Builds an absolute verification URL from a resolved path segment and token.
 */
export function buildConfigObjectVerificationUrlWithPath(
  baseUrl: string | null,
  path: string,
  token: string,
): string | null {
  if (!baseUrl?.trim() || !path.trim() || !token.trim()) {
    return null;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const url = new URL(`${normalizedBase}${path}`);
  url.searchParams.set('token', token.trim());
  return url.toString();
}
