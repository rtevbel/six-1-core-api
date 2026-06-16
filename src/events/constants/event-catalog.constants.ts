/** Canonical event catalog categories (P0). */
export const EVENT_CATALOG_CATEGORIES = [
  'process',
  'domain',
  'requirement',
] as const;

export type EventCatalogCategory = (typeof EVENT_CATALOG_CATEGORIES)[number];

/** Default payload contract version for newly registered events. */
export const DEFAULT_EVENT_SCHEMA_VERSION = '1.0';
