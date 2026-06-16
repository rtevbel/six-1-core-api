import { EventVars } from '../../common/event-variables';
import type { EventPayloadSchema } from '../../events/interfaces/event-payload-schema.interface';
import type {
  NotificationVariableCatalogEntry,
  NotificationVariableCatalogValueType,
} from '../context/notification-namespace.manifest';

interface JsonSchemaPropertyShape {
  type?: string | string[];
  enum?: unknown[];
  items?: JsonSchemaPropertyShape;
  description?: string;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function inferPayloadValueType(key: string): NotificationVariableCatalogValueType {
  const lower = key.toLowerCase();
  if (lower.endsWith('id')) {
    return 'number';
  }
  if (lower.includes('date') || lower.endsWith('at')) {
    return 'date';
  }
  if (lower.includes('url')) {
    return 'url';
  }
  if (lower.startsWith('is') || lower.startsWith('has')) {
    return 'boolean';
  }
  return 'string';
}

/**
 * Normalizes canonical / legacy event names for {@link EventVars} lookup.
 */
export function normalizeCatalogEventName(eventName: string): string {
  return eventName
    .trim()
    .replace(/^six1-event[._]/, '')
    .replace(/^notification[._]/, '');
}

function mapJsonSchemaTypeToCatalogType(
  key: string,
  property: JsonSchemaPropertyShape,
): NotificationVariableCatalogValueType {
  const rawType = Array.isArray(property.type)
    ? property.type[0]
    : property.type;

  switch (rawType) {
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'string';
    default:
      return inferPayloadValueType(key);
  }
}

/**
 * Builds `payload.*` catalog entries from an event catalog `payload_schema` (NV5.1).
 */
export function buildPayloadSchemaCatalogEntries(
  payloadSchema?: EventPayloadSchema | null,
): NotificationVariableCatalogEntry[] {
  if (!payloadSchema || typeof payloadSchema !== 'object') {
    return [];
  }

  const properties = (payloadSchema as Record<string, unknown>).properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return [];
  }

  const entries: NotificationVariableCatalogEntry[] = [];

  for (const [key, rawProperty] of Object.entries(
    properties as Record<string, unknown>,
  )) {
    const property = (rawProperty ?? {}) as JsonSchemaPropertyShape;
    entries.push({
      key: `payload.${key}`,
      label: humanizeKey(key),
      path: `payload.${key}`,
      type: mapJsonSchemaTypeToCatalogType(key, property),
      group: 'Payload',
      description:
        typeof property.description === 'string'
          ? property.description
          : 'Event payload field (catalog schema)',
    });
  }

  return entries;
}

/**
 * Builds payload / legacy catalog entries from {@link EventVars} (migration shim).
 */
export function buildEventVarsCatalogEntries(
  eventName?: string | null,
): NotificationVariableCatalogEntry[] {
  if (!eventName?.trim()) {
    return [];
  }

  const normalized = normalizeCatalogEventName(eventName);
  const spec = EventVars[normalized as keyof typeof EventVars];
  if (!spec) {
    return [];
  }

  const keys = Array.from(
    new Set([...(spec.required ?? []), ...(spec.optional ?? [])]),
  );
  const entries: NotificationVariableCatalogEntry[] = [];

  for (const key of keys) {
    entries.push({
      key: `legacy.${key}`,
      label: humanizeKey(key),
      path: key,
      type: inferPayloadValueType(key),
      group: 'Payload',
      description: 'Legacy flat template key (shimmed from event payload)',
    });
    entries.push({
      key: `payload.${key}`,
      label: humanizeKey(key),
      path: `payload.${key}`,
      type: inferPayloadValueType(key),
      group: 'Payload',
      description: 'Event payload field',
    });
  }

  return entries;
}

/**
 * Prefers catalog `payload_schema`; falls back to {@link EventVars} when absent.
 */
export function buildEventPayloadCatalogEntries(params: {
  eventName?: string | null;
  payloadSchema?: EventPayloadSchema | null;
}): NotificationVariableCatalogEntry[] {
  const schemaEntries = buildPayloadSchemaCatalogEntries(params.payloadSchema);
  if (schemaEntries.length > 0) {
    return schemaEntries;
  }

  return buildEventVarsCatalogEntries(params.eventName);
}

/**
 * @deprecated Use {@link buildEventPayloadCatalogEntries} with resolved `payload_schema`.
 */
export function buildEventVariableCatalogEntries(
  eventName?: string | null,
): NotificationVariableCatalogEntry[] {
  return buildEventVarsCatalogEntries(eventName);
}
