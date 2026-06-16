import { pathStartsWith } from './notification-context-path.util';

const ENTITY_RELATIONS_PREFIX = 'entity.relations';

/**
 * Unique relationship keys referenced as `entity.relations.<key>.*`.
 * Rejects nested relation walks (e.g. `entity.relations.a.relations.b`) — max graph depth 2.
 */
export function extractEntityRelationKeys(requiredPaths?: string[]): string[] {
  if (!requiredPaths?.length) {
    return [];
  }

  const keys = new Set<string>();
  for (const path of requiredPaths) {
    if (!pathStartsWith(path, ENTITY_RELATIONS_PREFIX)) {
      continue;
    }

    const segments = path.split('.');
    if (segments.length < 3) {
      continue;
    }

    if (segments.slice(3).includes('relations')) {
      continue;
    }

    const relationshipKey = segments[2]?.trim();
    if (!relationshipKey) {
      continue;
    }

    keys.add(relationshipKey);
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export function shouldHydrateEntityRelations(requiredPaths?: string[]): boolean {
  if (!requiredPaths?.length) {
    return false;
  }

  return requiredPaths.some((path) => pathStartsWith(path, ENTITY_RELATIONS_PREFIX));
}
