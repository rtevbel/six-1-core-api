/**
 * Generates a stable task identifier slug from a display name.
 */
export function generateTaskIdentifierFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Date.now().toString(36);
  return slug ? `${slug}-${suffix}` : `task-${suffix}`;
}
