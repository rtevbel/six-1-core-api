import {
  canonicalizeObjectType,
  listCanonicalObjectTypes,
  resolveEntityClassForObjectType,
} from '../core-field-descriptor/object-type-entity.registry';
import { isJunctionOnlyObjectType } from '../object-catalog-scope';
import {
  CORE_DATA_REF_PREFIX,
  ENTITY_KEY_DATA_REF_PREFIX,
  MANIFEST_API_LIST_PATTERN,
  REFERENCE_LIST_CATALOG_VERSION,
} from './reference-list.constants';
import type {
  ReferenceListCatalogEntry,
  ReferenceListCatalogView,
} from './reference-list.types';

export class ReferenceListValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferenceListValidationError';
  }
}

type CoreReferenceSeed = Omit<ReferenceListCatalogEntry, 'token' | 'kind'> & {
  token: string;
};

/** v1 shared platform lists — extend by configuration, not per-entity code forks. */
const CORE_REFERENCE_LIST_SEEDS: CoreReferenceSeed[] = [
  {
    token: 'core.system_statuses.list',
    objectType: 'system_status',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'statusId',
    labelKey: 'name',
    description: 'Platform system statuses',
  },
  {
    token: 'core.system_languages.list',
    objectType: 'system_language',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'languageId',
    labelKey: 'name',
    description: 'Platform system languages',
  },
  {
    token: 'core.categories.list',
    objectType: 'category',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'categoryId',
    labelKey: 'groupName',
    requiredQueryParams: ['tenantId'],
    description: 'Tenant-scoped categories',
  },
  {
    token: 'core.roles.list',
    objectType: 'role',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'roleId',
    labelKey: 'roleId',
    requiredQueryParams: ['tenantId'],
    description: 'Tenant-scoped roles',
  },
  {
    token: 'core.permissions.list',
    objectType: 'permission',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'permissionId',
    labelKey: 'permissionId',
    description: 'Global permissions catalog',
  },
  {
    token: 'core.notification_channels.list',
    objectType: 'notification_channel',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'channelId',
    labelKey: 'name',
    description: 'Notification delivery channels',
  },
  {
    token: 'core.events.list',
    objectType: 'event',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'eventId',
    labelKey: 'name',
    description: 'Platform event catalog',
  },
  {
    token: 'entity-key:notification_template',
    objectType: 'notification_template',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'templateId',
    labelKey: 'name',
    description: 'Notification templates',
  },
  {
    token: 'entity-key:notification_channel',
    objectType: 'notification_channel',
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'channelId',
    labelKey: 'name',
    description: 'Notification channels (entity-key alias)',
  },
];

/** Legacy token aliases kept for backward compatibility with saved field metadata. */
const DATA_REF_ALIASES: Record<string, string> = {
  'core.languages.list': 'core.system_languages.list',
};

const CORE_REFERENCE_BY_TOKEN = new Map<string, ReferenceListCatalogEntry>();

for (const seed of CORE_REFERENCE_LIST_SEEDS) {
  const entry: ReferenceListCatalogEntry = {
    ...seed,
    kind: seed.token.startsWith(ENTITY_KEY_DATA_REF_PREFIX)
      ? 'entity_key'
      : 'core',
  };
  CORE_REFERENCE_BY_TOKEN.set(seed.token, entry);
}

function normalizeDataRefToken(dataRef: string): string {
  const trimmed = dataRef.trim();
  return DATA_REF_ALIASES[trimmed] ?? trimmed;
}

function buildEntityKeyCatalogEntry(
  objectType: string,
): ReferenceListCatalogEntry | null {
  const canonical = canonicalizeObjectType(objectType);
  if (!canonical || isJunctionOnlyObjectType(canonical)) {
    return null;
  }
  if (!resolveEntityClassForObjectType(canonical)) {
    return null;
  }

  return {
    token: `${ENTITY_KEY_DATA_REF_PREFIX}${canonical}`,
    kind: 'entity_key',
    objectType: canonical,
    listPattern: MANIFEST_API_LIST_PATTERN,
    valueKey: 'id',
    labelKey: 'name',
    description: `List options for ${canonical} via runner manifest api.list`,
  };
}

/**
 * Resolves a `dataRef` token to catalog metadata when known.
 * Supports `core.*.list` seeds, `entity-key:{entityKey}`, and registered entity types.
 */
export function resolveReferenceListToken(
  dataRef: string,
): ReferenceListCatalogEntry | null {
  const normalized = normalizeDataRefToken(dataRef);

  const coreHit = CORE_REFERENCE_BY_TOKEN.get(normalized);
  if (coreHit) {
    return coreHit;
  }

  if (normalized.startsWith(ENTITY_KEY_DATA_REF_PREFIX)) {
    const entityKey = normalized.slice(ENTITY_KEY_DATA_REF_PREFIX.length).trim();
    if (!entityKey) {
      return null;
    }
    return buildEntityKeyCatalogEntry(entityKey);
  }

  if (normalized.startsWith(CORE_DATA_REF_PREFIX)) {
    return null;
  }

  return buildEntityKeyCatalogEntry(normalized);
}

/**
 * Full system catalog: shared `core.*` entries plus dynamic `entity-key:*` rows
 * for every registered non-junction object type.
 */
export function buildReferenceListCatalog(): ReferenceListCatalogView {
  const byToken = new Map<string, ReferenceListCatalogEntry>();

  for (const entry of CORE_REFERENCE_BY_TOKEN.values()) {
    byToken.set(entry.token, entry);
  }

  for (const objectType of listCanonicalObjectTypes()) {
    const entry = buildEntityKeyCatalogEntry(objectType);
    if (entry && !byToken.has(entry.token)) {
      byToken.set(entry.token, entry);
    }
  }

  const entries = Array.from(byToken.values()).sort((a, b) =>
    a.token.localeCompare(b.token),
  );

  return {
    catalogVersion: REFERENCE_LIST_CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    entries,
  };
}

/**
 * Convenience slice: resolved catalog rows for `dataRef` tokens used on a schema.
 */
export function buildSchemaLookupCatalog(params: {
  dataRefs: string[];
}): ReferenceListCatalogEntry[] {
  const out: ReferenceListCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const dataRef of params.dataRefs) {
    const normalized = normalizeDataRefToken(dataRef);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const entry = resolveReferenceListToken(normalized);
    if (entry) {
      out.push(entry);
    }
  }

  return out;
}

/**
 * Validates a `dataRef` against the catalog. Throws when `strict` and unknown.
 */
export function assertReferenceListDataRefKnown(
  dataRef: string,
  options: { strict: boolean },
): ReferenceListCatalogEntry | null {
  const entry = resolveReferenceListToken(dataRef);
  if (entry) {
    return entry;
  }

  const message = `Unknown lookup dataRef "${dataRef.trim()}". Use core.*.list or entity-key:{entityKey} for a registered object type.`;
  if (options.strict) {
    throw new ReferenceListValidationError(message);
  }

  return null;
}
