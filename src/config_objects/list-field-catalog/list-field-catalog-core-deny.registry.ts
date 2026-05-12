/**
 * Core DB field keys that must never appear on list filter/sort catalogs (secrets).
 * Keyed by canonical {@link canonicalizeObjectType} token.
 */
const CORE_FIELD_KEYS_DENIED_FOR_OBJECT_LIST_CATALOG: Readonly<
  Record<string, readonly string[]>
> = {
  customer: ['password'],
  /** Password hash column on `users` */
  user: ['password'],
  /** Signed invitation URLs */
  customer_invitation: ['token'],
};

/** Denied core keys for catalog emission (builder / gateway). */
export function deniedCoreFieldKeysForObjectListCatalog(
  canonicalObjectType: string,
): ReadonlySet<string> {
  const list = CORE_FIELD_KEYS_DENIED_FOR_OBJECT_LIST_CATALOG[canonicalObjectType];
  return new Set(list ?? []);
}
