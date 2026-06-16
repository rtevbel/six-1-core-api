/**
 * Dot-path helpers for {@link NotificationContext} trees.
 */

const PATH_SEGMENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertValidPath(path: string): void {
  if (!path.trim()) {
    throw new Error('Path must not be empty.');
  }
  for (const segment of path.split('.')) {
    if (!PATH_SEGMENT.test(segment)) {
      throw new Error(`Invalid path segment: ${segment}`);
    }
  }
}

/**
 * Reads a nested value using dot notation (e.g. `entity.fields.name`).
 */
export function getByPath(
  root: Record<string, unknown>,
  path: string,
): unknown {
  assertValidPath(path);
  if (!path.includes('.')) {
    return root[path];
  }

  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    if (typeof acc !== 'object') {
      return undefined;
    }
    return (acc as Record<string, unknown>)[key];
  }, root);
}

/**
 * Writes a nested value, creating plain object shells as needed.
 */
export function setByPath(
  root: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  assertValidPath(path);
  const segments = path.split('.');
  if (segments.length === 1) {
    root[segments[0]] = value;
    return;
  }

  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const existing = cursor[key];
    if (
      existing === null ||
      existing === undefined ||
      typeof existing !== 'object' ||
      Array.isArray(existing)
    ) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
}

/**
 * All prefixes of a dot-path, e.g. `entity.fields.name` →
 * [`entity`, `entity.fields`, `entity.fields.name`].
 */
export function collectPathPrefixes(path: string): string[] {
  assertValidPath(path);
  const segments = path.split('.');
  const prefixes: string[] = [];
  for (let i = 1; i <= segments.length; i++) {
    prefixes.push(segments.slice(0, i).join('.'));
  }
  return prefixes;
}

/**
 * Unique sorted prefixes for lazy hydration across multiple template paths.
 */
export function collectPathPrefixesFromMany(paths: string[]): string[] {
  const seen = new Set<string>();
  for (const path of paths) {
    if (!path.trim()) continue;
    for (const prefix of collectPathPrefixes(path)) {
      seen.add(prefix);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/**
 * Returns true when `path` equals or extends `namespacePrefix`
 * (e.g. `entity.fields.name` is under `entity.fields`).
 */
export function pathStartsWith(path: string, namespacePrefix: string): boolean {
  return path === namespacePrefix || path.startsWith(`${namespacePrefix}.`);
}
