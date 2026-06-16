import { DataSource, type ObjectLiteral } from 'typeorm';
import {
  canonicalizeObjectType,
  resolveEntityClassForObjectType,
} from './core-field-descriptor/object-type-entity.registry';

/**
 * Resolves the single numeric primary-key property for a registered entity class.
 */
export function resolveSinglePrimaryKeyPropertyName(
  dataSource: DataSource,
  entityClass: Function,
): string | null {
  const metadata = dataSource.getMetadata(entityClass);
  if (metadata.primaryColumns.length !== 1) {
    return null;
  }
  return metadata.primaryColumns[0].propertyName;
}

/**
 * Loads a core row for any object type registered in the entity catalog
 * (`resolveEntityClassForObjectType`), including `system_table` types such as
 * `tenant`, `user`, and `role`.
 */
export async function loadCoreEntityFromRegistry(
  dataSource: DataSource,
  objectType: string,
  coreId: number,
): Promise<ObjectLiteral | null> {
  if (!Number.isFinite(coreId) || coreId < 1) {
    return null;
  }

  const entityClass = resolveEntityClassForObjectType(
    canonicalizeObjectType(objectType),
  );
  if (!entityClass) {
    return null;
  }

  const pkProperty = resolveSinglePrimaryKeyPropertyName(dataSource, entityClass);
  if (!pkProperty) {
    return null;
  }

  return dataSource.getRepository(entityClass).findOne({
    where: { [pkProperty]: Math.trunc(coreId) } as ObjectLiteral,
  });
}
