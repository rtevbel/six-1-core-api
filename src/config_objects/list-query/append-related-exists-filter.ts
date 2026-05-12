import type { Type } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  canonicalizeObjectType,
  resolveEntityClassForObjectType,
} from '../core-field-descriptor/object-type-entity.registry';
import type { RelationDescriptor } from '../interfaces/relation-descriptor.interface';
import { appendParameterizedListFilterPredicate } from './append-parameterized-list-filter-predicate';
import type { ListFilterOperator } from './append-parameterized-list-filter-predicate';

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

function resolveChildFkPointingToParent(
  dataSource: DataSource,
  parentEntityClass: Type<object>,
  childEntityClass: Type<object>,
): { childFkProp: string; parentPkProp: string } | null {
  let childMd;
  try {
    childMd = dataSource.getMetadata(childEntityClass);
  } catch {
    return null;
  }

  for (const m2o of childMd.manyToOneRelations) {
    const Related = relationTargetConstructor(m2o);
    if (Related !== parentEntityClass) {
      continue;
    }
    const jc = m2o.joinColumns[0];
    if (!jc?.referencedColumn) {
      continue;
    }
    return {
      childFkProp: jc.propertyName,
      parentPkProp: jc.referencedColumn.propertyName,
    };
  }

  return null;
}

function resolveRootFkPointingToRelated(
  dataSource: DataSource,
  rootEntityClass: Type<object>,
  relatedEntityClass: Type<object>,
): { rootFkProp: string; relatedPkProp: string } | null {
  let rootMd;
  try {
    rootMd = dataSource.getMetadata(rootEntityClass);
  } catch {
    return null;
  }

  for (const m2o of rootMd.manyToOneRelations) {
    const Related = relationTargetConstructor(m2o);
    if (Related !== relatedEntityClass) {
      continue;
    }
    const jc = m2o.joinColumns[0];
    if (!jc?.referencedColumn) {
      continue;
    }
    return {
      rootFkProp: jc.propertyName,
      relatedPkProp: jc.referencedColumn.propertyName,
    };
  }

  return null;
}

export interface RelatedExistsStructuredFilterClause {
  fieldKey: string;
  operator: ListFilterOperator;
  value: unknown;
}

/**
 * ANDs an EXISTS (SELECT 1 FROM related … correlation … predicate)
 * predicate for schema-driven relation filters — either FK-on-child or FK-on-root.
 *
 * Throws when the relation has no compatible ORM join or the referenced field cannot be resolved as a DB column property.
 */
export function appendRelatedExistsFilter(
  dataSource: DataSource,
  qb: SelectQueryBuilder<object>,
  options: {
    rootEntityClass: Type<object>;
    rootAlias: string;
    rel: RelationDescriptor;
    filter: RelatedExistsStructuredFilterClause;
    paramNamespace: string;
  },
): void {
  const { rootEntityClass, rootAlias, rel, filter } = options;

  if (rel.cardinality === 'many_to_many') {
    throw new RpcException(
      'Related list filtering does not yet support many-to-many relationships.',
    );
  }

  const relatedCanonical = canonicalizeObjectType(rel.toObjectType);
  const resolvedRelated =
    resolveEntityClassForObjectType(relatedCanonical) ??
    resolveEntityClassForObjectType(rel.toObjectType);

  const relatedEntityClass = resolvedRelated as unknown as Type<object> | null;

  if (!relatedEntityClass) {
    throw new RpcException(
      `Related type "${rel.toObjectType}" is not mapped to an entity.`,
    );
  }

  let relatedMd;
  try {
    relatedMd = dataSource.getMetadata(
      resolvedRelated as unknown as Type<object>,
    );
  } catch {
    throw new RpcException(
      `Failed to resolve entity metadata for related type "${rel.toObjectType}".`,
    );
  }

  const relatedColumn = relatedMd.findColumnWithPropertyName(filter.fieldKey);
  if (
    !relatedColumn ||
    !/^[A-Za-z0-9_]+$/.test(filter.fieldKey) ||
    filter.fieldKey.startsWith('_')
  ) {
    throw new RpcException(
      `Related filter field "${filter.fieldKey}" is not a mapped column.`,
    );
  }

  const correlationFromChild =
    resolveChildFkPointingToParent(
      dataSource,
      rootEntityClass,
      relatedEntityClass,
    ) ?? null;
  const correlationFromRoot =
    resolveRootFkPointingToRelated(
      dataSource,
      rootEntityClass,
      relatedEntityClass,
    ) ?? null;

  const subAlias = `rel_${options.paramNamespace}`;

  const subQ = qb.subQuery().select('1').from(relatedEntityClass, subAlias);

  if (correlationFromChild) {
    subQ.andWhere(
      `${subAlias}.${correlationFromChild.childFkProp} = ${rootAlias}.${correlationFromChild.parentPkProp}`,
    );
  } else if (correlationFromRoot) {
    subQ.andWhere(
      `${rootAlias}.${correlationFromRoot.rootFkProp} = ${subAlias}.${correlationFromRoot.relatedPkProp}`,
    );
  } else {
    throw new RpcException(
      `No ORM join path from root to related object type "${rel.toObjectType}" for relationship "${rel.relationshipKey}".`,
    );
  }

  const relatedExpression = `${subAlias}.${filter.fieldKey}`;
  appendParameterizedListFilterPredicate(
    subQ as SelectQueryBuilder<object>,
    relatedExpression,
    {
      operator: filter.operator,
      value: filter.value,
      logicalField: `${rel.relationshipKey}.${filter.fieldKey}`,
    },
    `${options.paramNamespace}_rv`,
  );

  qb.andWhere(`EXISTS (${subQ.getQuery()})`, subQ.getParameters());
}
