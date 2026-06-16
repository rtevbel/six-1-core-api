/**
 * Normalizes `required_permissions` JSON from template/instance rows.
 */
export function normalizeRequiredPermissions(
  raw: unknown,
): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
