/**
 * Default frontend path segments for config-object email verification (Phase 5).
 * Override via `CONFIG_OBJECT_VERIFICATION_URL_REGISTRY` env JSON.
 */
export const DEFAULT_CONFIG_OBJECT_VERIFICATION_URL_PATHS: Record<
  string,
  string
> = {
  customer: '/verify-customer',
  tenant_user: '/verify-tenant-user',
  /** Legacy objectType alias — old links only; new emails use `tenant_user`. */
  user: '/verify-email',
};

export function normalizeVerificationUrlPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Resolves the path segment for a config object verification link.
 */
export function resolveVerificationUrlPath(
  objectType: string,
  overrides?: Record<string, string> | null,
): string {
  const key = objectType.trim();
  if (!key) {
    return '';
  }

  const override = overrides?.[key];
  if (override?.trim()) {
    return normalizeVerificationUrlPath(override);
  }

  const fromDefaults = DEFAULT_CONFIG_OBJECT_VERIFICATION_URL_PATHS[key];
  if (fromDefaults) {
    return fromDefaults;
  }

  const segment = key.replace(/_/g, '-');
  return `/verify-${segment}`;
}

/**
 * Parses optional env/ConfigService JSON overrides for verification URL paths.
 */
export function parseVerificationUrlRegistryFromConfig(
  raw: unknown,
): Record<string, string> | null {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const registry: Record<string, string> = {};
  for (const [key, path] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key === 'string' && typeof path === 'string' && path.trim()) {
      registry[key.trim()] = normalizeVerificationUrlPath(path);
    }
  }

  return Object.keys(registry).length > 0 ? registry : null;
}
