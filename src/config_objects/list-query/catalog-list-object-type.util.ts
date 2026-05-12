import type { Type } from '@nestjs/common';
import {
  canonicalizeObjectType,
  resolveObjectTypeForEntityClass,
} from '../core-field-descriptor/object-type-entity.registry';

/**
 * Canonical object_type token passed to {@link ConfigObjectsService.getObjectListFieldCatalog}.
 */
export function canonicalListObjectTypeForEntity(
  entityClass: Type<object>,
): string {
  const table = resolveObjectTypeForEntityClass(entityClass);
  if (!table || typeof table !== 'string') {
    throw new Error(
      `No TypeORM table name mapping for entity ${entityClass?.name}`,
    );
  }
  return canonicalizeObjectType(table);
}
