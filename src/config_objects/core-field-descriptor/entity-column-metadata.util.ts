import { getMetadataArgsStorage } from 'typeorm';

/**
 * Returns TypeORM **scalar column** property names declared on `entityClass`
 * (including primary / generated / created / updated columns).
 *
 * Relation-decorated properties are excluded here — they are not SoR `corePatch` keys.
 */
export function getEntityScalarColumnPropertyNames(
  entityClass: Function,
): Set<string> {
  const storage = getMetadataArgsStorage();
  const names = new Set<string>();
  for (const col of storage.columns) {
    if (col.target === entityClass) {
      names.add(col.propertyName);
    }
  }
  return names;
}
