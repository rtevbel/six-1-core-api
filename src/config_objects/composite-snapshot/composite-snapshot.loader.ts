import type { Type } from '@nestjs/common';
import { DataSource, type ObjectLiteral } from 'typeorm';
import {
  canonicalizeObjectType,
  resolveEntityClassForObjectType,
  resolveObjectTypeForEntityClass,
} from '../core-field-descriptor/object-type-entity.registry';
import { resolveSinglePrimaryKeyPropertyName } from '../core-entity-registry.loader';
import type { RelationDescriptor } from '../interfaces/relation-descriptor.interface';

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

export function serializeEntityRow(row: ObjectLiteral): Record<string, unknown> {
  return { ...row };
}

/**
 * Loads single related rows for each many-to-one FK on the primary entity
 * (e.g. tenant_user → user, tenant).
 */
export async function loadManyToOneSnapshotsForPrimary(
  dataSource: DataSource,
  primaryEntityClass: Function,
  primaryRow: ObjectLiteral,
): Promise<Record<string, unknown>> {
  const md = dataSource.getMetadata(primaryEntityClass);
  const out: Record<string, unknown> = {};

  for (const m2o of md.manyToOneRelations) {
    const target = relationTargetConstructor(m2o);
    if (!target) {
      continue;
    }
    const tableObjectType = resolveObjectTypeForEntityClass(target);
    if (!tableObjectType) {
      continue;
    }
    const snapshotKey = canonicalizeObjectType(tableObjectType);
    const joinCol = m2o.joinColumns[0];
    if (!joinCol) {
      continue;
    }
    const fkValue = primaryRow[joinCol.propertyName];
    if (fkValue === null || fkValue === undefined) {
      continue;
    }
    const pkProp = resolveSinglePrimaryKeyPropertyName(dataSource, target);
    if (!pkProp) {
      continue;
    }
    const related = await dataSource.getRepository(target).findOne({
      where: { [pkProp]: fkValue } as ObjectLiteral,
    });
    if (related) {
      out[snapshotKey] = serializeEntityRow(related);
    }
  }

  return out;
}

/**
 * Loads first-level child rows for schema `one_to_many` relations (FK on child).
 */
export async function loadOneToManySnapshotsForRelations(
  dataSource: DataSource,
  options: {
    primaryEntityClass: Function;
    primaryRow: ObjectLiteral;
    relations: RelationDescriptor[];
    maxRowsPerRelation?: number;
  },
): Promise<Record<string, unknown>> {
  const {
    primaryEntityClass,
    primaryRow,
    relations,
    maxRowsPerRelation = 25,
  } = options;
  const rootMd = dataSource.getMetadata(primaryEntityClass);
  const rootPkProp = rootMd.primaryColumns[0]?.propertyName;
  if (!rootPkProp) {
    return {};
  }
  const rootId = primaryRow[rootPkProp];
  if (rootId === null || rootId === undefined) {
    return {};
  }

  const out: Record<string, unknown> = {};

  for (const rel of relations) {
    if (rel.cardinality !== 'one_to_many') {
      continue;
    }
    const relatedClass = resolveEntityClassForObjectType(rel.toObjectType);
    if (!relatedClass) {
      continue;
    }
    let relatedMd;
    try {
      relatedMd = dataSource.getMetadata(relatedClass);
    } catch {
      continue;
    }

    const childFk = relatedMd.manyToOneRelations.find((m2o) => {
      const target = relationTargetConstructor(m2o);
      return target === primaryEntityClass;
    });
    if (!childFk?.joinColumns[0]) {
      continue;
    }

    const rows = await dataSource.getRepository(relatedClass).find({
      where: { [childFk.joinColumns[0].propertyName]: rootId } as ObjectLiteral,
      take: maxRowsPerRelation,
    });
    if (rows.length) {
      out[rel.relationshipKey] = rows.map((row) => serializeEntityRow(row));
    }
  }

  return out;
}
