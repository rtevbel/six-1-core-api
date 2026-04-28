import { getMetadataArgsStorage } from 'typeorm';

import {
  resolveEntityClassForObjectType,
  resolveObjectTypeForEntityClass,
} from './object-type-entity.registry';

describe('object type entity registry coverage', () => {
  it('resolves every TypeORM table by its canonical objectType', () => {
    const tableNames = getMetadataArgsStorage().tables
      .map((table) => (typeof table.name === 'string' ? table.name : null))
      .filter((tableName): tableName is string => tableName != null)
      .sort((a, b) => a.localeCompare(b));

    const unresolved = tableNames.filter(
      (tableName) => resolveEntityClassForObjectType(tableName) == null,
    );

    expect(unresolved).toEqual([]);
  });

  it('round-trips resolved entities back to their table objectType', () => {
    const tableNames = getMetadataArgsStorage().tables
      .map((table) => (typeof table.name === 'string' ? table.name : null))
      .filter((tableName): tableName is string => tableName != null)
      .sort((a, b) => a.localeCompare(b));

    for (const tableName of tableNames) {
      const entityClass = resolveEntityClassForObjectType(tableName);
      expect(entityClass).not.toBeNull();
      expect(resolveObjectTypeForEntityClass(entityClass!)).toBe(tableName);
    }
  });
});
