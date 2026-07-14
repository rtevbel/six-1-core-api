/** Catalog shape version returned by `v0.1_get_reference_list_catalog`. */
export const REFERENCE_LIST_CATALOG_VERSION = 1 as const;

/**
 * When truthy (`true`, `1`, `yes`, `on`), unknown `dataRef` tokens are rejected on
 * field save. When unset/false, unknown tokens log a warning and save proceeds.
 */
export const REFERENCE_LIST_STRICT_VALIDATION_KEY =
  'REFERENCE_LIST_STRICT_VALIDATION';

/** Prefix for entity-backed lookup tokens (`entity-key:customer`, …). */
export const ENTITY_KEY_DATA_REF_PREFIX = 'entity-key:';

/** Prefix for shared platform reference lists (`core.system_status.list`, …). */
export const CORE_DATA_REF_PREFIX = 'core.';

/** Resolution hint for gateway/mobile: list options via object runner manifest `api.list`. */
export const MANIFEST_API_LIST_PATTERN = 'manifest.api.list';
