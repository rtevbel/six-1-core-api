import { getMetadataArgsStorage } from 'typeorm';

import {
  resolveEntityClassForObjectType,
  resolveObjectTypeForEntityClass,
} from '../core-field-descriptor/object-type-entity.registry';
import { isJunctionOnlyObjectType } from '../object-catalog-scope';
import type { RelationDescriptor } from '../interfaces/relation-descriptor.interface';

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (m) => m.toUpperCase());
}

function buildRelationshipKey(fromObjectType: string, toObjectType: string): string {
  if (toObjectType.startsWith(`${fromObjectType}_`)) {
    return toObjectType;
  }
  return `${fromObjectType}_${toObjectType}`;
}

function inferCardinalityFromRelationType(
  relationType: string,
): RelationDescriptor['cardinality'] {
  if (relationType === 'many-to-many') {
    return 'many_to_many';
  }
  if (relationType === 'many-to-one') {
    return 'many_to_one';
  }
  return 'one_to_many';
}

function resolveTargetObjectTypeFromJunction(
  fromEntity: Function,
  junctionEntity: Function,
): string | null {
  const storage = getMetadataArgsStorage();
  const junctionRels = storage.relations.filter(
    (r) => r.target === junctionEntity && r.relationType === 'many-to-one',
  );
  const candidates: string[] = [];
  for (const rel of junctionRels) {
    const targetEntity =
      typeof rel.type === 'function' ? (rel.type as () => Function)() : null;
    if (!targetEntity || targetEntity === fromEntity) {
      continue;
    }
    const targetObjectType = resolveObjectTypeForEntityClass(targetEntity);
    if (!targetObjectType || isJunctionOnlyObjectType(targetObjectType)) {
      continue;
    }
    candidates.push(targetObjectType);
  }
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => a.localeCompare(b));
  return candidates[0];
}

/**
 * Generates ORM-derived relation descriptors for one source object type.
 */
export function generateOrmRelationDescriptorsForObjectType(
  fromObjectType: string,
): RelationDescriptor[] {
  const fromEntity = resolveEntityClassForObjectType(fromObjectType);
  if (!fromEntity) {
    return [];
  }

  const storage = getMetadataArgsStorage();
  const rels = storage.relations.filter((r) => {
    if (r.target !== fromEntity) {
      return false;
    }
    return r.relationType === 'one-to-many' || r.relationType === 'many-to-many';
  });

  const out: RelationDescriptor[] = [];
  for (const rel of rels) {
    const targetEntity =
      typeof rel.type === 'function' ? (rel.type as () => Function)() : null;
    if (!targetEntity) {
      continue;
    }

    let toObjectType = resolveObjectTypeForEntityClass(targetEntity);
    let cardinality = inferCardinalityFromRelationType(rel.relationType);

    if (toObjectType && isJunctionOnlyObjectType(toObjectType)) {
      const lifted = resolveTargetObjectTypeFromJunction(fromEntity, targetEntity);
      if (!lifted) {
        continue;
      }
      toObjectType = lifted;
      cardinality = 'many_to_many';
    }

    if (!toObjectType || isJunctionOnlyObjectType(toObjectType)) {
      continue;
    }

    const relationshipKey = buildRelationshipKey(fromObjectType, toObjectType);
    out.push({
      fromObjectType,
      toObjectType,
      relationshipKey,
      displayName: humanizeKey(relationshipKey),
      cardinality,
      relationshipSource: 'orm',
      isActive: true,
      queryConfig: {},
      relationManifestJson: null,
    });
  }

  const byKey = new Map<string, RelationDescriptor>();
  for (const row of out) {
    if (!byKey.has(row.relationshipKey)) {
      byKey.set(row.relationshipKey, row);
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.relationshipKey.localeCompare(b.relationshipKey),
  );
}
