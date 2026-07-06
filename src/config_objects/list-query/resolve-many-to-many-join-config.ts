import type { Type } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ManyToManyJoinConfig {
  joinTable: string;
  joinLocalKey: string;
  joinForeignKey: string;
  targetTable: string;
  targetPrimaryKey: string;
  junctionEntityClass: Type<object>;
  relatedEntityClass: Type<object>;
  joinLocalProperty: string;
  joinForeignProperty: string;
  relatedPrimaryProperty: string;
  rootPrimaryProperty: string;
}

function relationTargetConstructor(relation: {
  type?: unknown;
}): Type<object> | null {
  if (typeof relation.type !== 'function') {
    return null;
  }
  try {
    return (relation.type as unknown as () => Type<object>)();
  } catch {
    return null;
  }
}

function isSafeSqlIdentifier(value: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(value);
}

function columnDatabaseName(column: {
  databaseName: string;
  propertyName: string;
}): string {
  return column.databaseName || column.propertyName;
}

/**
 * Builds junction join metadata from explicit `queryConfig` or ORM inference.
 */
export function resolveManyToManyJoinConfig(
  dataSource: DataSource,
  options: {
    rootEntityClass: Type<object>;
    relatedEntityClass: Type<object>;
    queryConfig: Record<string, unknown>;
  },
): ManyToManyJoinConfig | null {
  const explicit = resolveFromExplicitQueryConfig(
    dataSource,
    options.rootEntityClass,
    options.relatedEntityClass,
    options.queryConfig,
  );
  if (explicit) {
    return explicit;
  }

  return inferManyToManyJoinFromOrm(
    dataSource,
    options.rootEntityClass,
    options.relatedEntityClass,
  );
}

function resolveFromExplicitQueryConfig(
  dataSource: DataSource,
  rootEntityClass: Type<object>,
  relatedEntityClass: Type<object>,
  queryConfig: Record<string, unknown>,
): ManyToManyJoinConfig | null {
  const joinTable = queryConfig.join_table;
  const joinLocalKey = queryConfig.join_local_key;
  const joinForeignKey = queryConfig.join_foreign_key;
  const targetTable = queryConfig.target_table;
  if (
    typeof joinTable !== 'string' ||
    typeof joinLocalKey !== 'string' ||
    typeof joinForeignKey !== 'string' ||
    typeof targetTable !== 'string'
  ) {
    return null;
  }

  if (
    !isSafeSqlIdentifier(joinTable) ||
    !isSafeSqlIdentifier(joinLocalKey) ||
    !isSafeSqlIdentifier(joinForeignKey) ||
    !isSafeSqlIdentifier(targetTable)
  ) {
    return null;
  }

  const targetPrimaryKey =
    typeof queryConfig.target_primary_key === 'string' &&
    isSafeSqlIdentifier(queryConfig.target_primary_key)
      ? queryConfig.target_primary_key
      : joinForeignKey;

  let junctionEntityClass: Type<object> | null = null;
  for (const table of dataSource.entityMetadatas) {
    if (table.tableName === joinTable) {
      junctionEntityClass = table.target as Type<object>;
      break;
    }
  }
  if (!junctionEntityClass) {
    return null;
  }

  const rootMd = dataSource.getMetadata(rootEntityClass);
  const relatedMd = dataSource.getMetadata(relatedEntityClass);
  const junctionMd = dataSource.getMetadata(junctionEntityClass);

  const joinLocalColumn = junctionMd.columns.find(
    (c) => columnDatabaseName(c) === joinLocalKey,
  );
  const joinForeignColumn = junctionMd.columns.find(
    (c) => columnDatabaseName(c) === joinForeignKey,
  );
  if (!joinLocalColumn || !joinForeignColumn) {
    return null;
  }

  const relatedPkColumn = relatedMd.columns.find(
    (c) => columnDatabaseName(c) === targetPrimaryKey,
  );
  if (!relatedPkColumn) {
    return null;
  }

  return {
    joinTable,
    joinLocalKey,
    joinForeignKey,
    targetTable,
    targetPrimaryKey,
    junctionEntityClass,
    relatedEntityClass,
    joinLocalProperty: joinLocalColumn.propertyName,
    joinForeignProperty: joinForeignColumn.propertyName,
    relatedPrimaryProperty: relatedPkColumn.propertyName,
    rootPrimaryProperty: rootMd.primaryColumns[0]?.propertyName ?? '',
  };
}

function inferManyToManyJoinFromOrm(
  dataSource: DataSource,
  rootEntityClass: Type<object>,
  relatedEntityClass: Type<object>,
): ManyToManyJoinConfig | null {
  let rootMd;
  try {
    rootMd = dataSource.getMetadata(rootEntityClass);
  } catch {
    return null;
  }

  const relatedMd = dataSource.getMetadata(relatedEntityClass);
  const rootPkProp = rootMd.primaryColumns[0]?.propertyName;
  const relatedPkProp = relatedMd.primaryColumns[0]?.propertyName;
  if (!rootPkProp || !relatedPkProp) {
    return null;
  }

  for (const o2m of rootMd.oneToManyRelations) {
    const junctionClass = relationTargetConstructor(o2m);
    if (!junctionClass) {
      continue;
    }

    let junctionMd;
    try {
      junctionMd = dataSource.getMetadata(junctionClass);
    } catch {
      continue;
    }

    let localJoin: { property: string; database: string } | null = null;
    let foreignJoin: { property: string; database: string } | null = null;

    for (const m2o of junctionMd.manyToOneRelations) {
      const target = relationTargetConstructor(m2o);
      const jc = m2o.joinColumns[0];
      if (!jc) {
        continue;
      }
      const database = columnDatabaseName(jc);
      if (target === rootEntityClass) {
        localJoin = { property: jc.propertyName, database };
      }
      if (target === relatedEntityClass) {
        foreignJoin = { property: jc.propertyName, database };
      }
    }

    if (!localJoin || !foreignJoin) {
      continue;
    }

    return {
      joinTable: junctionMd.tableName,
      joinLocalKey: localJoin.database,
      joinForeignKey: foreignJoin.database,
      targetTable: relatedMd.tableName,
      targetPrimaryKey: columnDatabaseName(relatedMd.primaryColumns[0]),
      junctionEntityClass: junctionClass,
      relatedEntityClass,
      joinLocalProperty: localJoin.property,
      joinForeignProperty: foreignJoin.property,
      relatedPrimaryProperty: relatedPkProp,
      rootPrimaryProperty: rootPkProp,
    };
  }

  return null;
}

/**
 * Serializes join metadata for persistence on `RelationDescriptor.queryConfig`.
 */
export function manyToManyJoinConfigToQueryConfig(
  config: ManyToManyJoinConfig,
): Record<string, string> {
  return {
    join_table: config.joinTable,
    join_local_key: config.joinLocalKey,
    join_foreign_key: config.joinForeignKey,
    target_table: config.targetTable,
    target_primary_key: config.targetPrimaryKey,
  };
}
