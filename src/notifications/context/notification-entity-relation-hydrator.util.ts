import type { ConfigObjectsService } from '../../config_objects/config_objects.service';
import type { ConfigObjectResolvedInstance } from '../../config_objects/interfaces/config-object-resolved-instance.interface';
import type { CoreFieldDescriptor } from '../../config_objects/core-field-descriptor/core-field-descriptor.types';
import type { NotificationContext } from './notification-context.types';
import { parseOptionalPositiveInt } from './notification-context-source.util';
import { buildEntityFieldsFromResolvedInstance } from './notification-entity-fields.util';
import { extractEntityRelationKeys } from './notification-entity-relation-path.util';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function extractCoreIdFromRelatedRow(
  row: Record<string, unknown>,
  objectType?: string | null,
): number | null {
  const camelId =
    objectType && objectType.length > 0
      ? `${objectType.charAt(0).toLowerCase()}${objectType.slice(1)}Id`
      : null;
  const snakeId =
    objectType && objectType.length > 0
      ? `${objectType.replace(/([A-Z])/g, '_$1').toLowerCase()}_id`
      : null;

  const candidates = [
    camelId,
    snakeId,
    'id',
    ...Object.keys(row).filter((key) => key.endsWith('Id') || key.endsWith('_id')),
  ].filter((value): value is string => Boolean(value));

  for (const key of candidates) {
    const parsed = parseOptionalPositiveInt(row[key]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function mapRowToRelationFields(
  row: Record<string, unknown>,
  fieldRegistry?: CoreFieldDescriptor[],
): Record<string, unknown> {
  if (!fieldRegistry?.length) {
    return { ...row };
  }

  const fields: Record<string, unknown> = {};
  for (const descriptor of fieldRegistry) {
    if (Object.prototype.hasOwnProperty.call(row, descriptor.fieldKey)) {
      fields[descriptor.fieldKey] = row[descriptor.fieldKey];
    }
  }

  return Object.keys(fields).length > 0 ? fields : { ...row };
}

/**
 * Hydrates `entity.relations.<key>.fields.*` for sor_bound parents (NV6).
 */
export async function hydrateEntityRelations(
  configObjectsService: ConfigObjectsService,
  context: NotificationContext,
  tenantId: number,
  parentObjectType: string,
  parentResolved: ConfigObjectResolvedInstance,
  requiredPaths?: string[],
): Promise<void> {
  if (parentResolved.resolutionMode !== 'sor_bound') {
    return;
  }

  const relationKeys = extractEntityRelationKeys(requiredPaths);
  if (!relationKeys.length) {
    return;
  }

  const related = await configObjectsService.getRelatedObjects(
    tenantId,
    parentObjectType,
    parentResolved.coreId,
  );

  const schema = parentResolved.schema;

  for (const relationshipKey of relationKeys) {
    const rows = related.relationships[relationshipKey];
    if (!Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    const descriptor = schema.relations?.find(
      (rel) => rel.relationshipKey === relationshipKey,
    );
    const targetObjectType = descriptor?.toObjectType ?? null;
    const primaryRow = asRecord(rows[0]);
    const coreId = extractCoreIdFromRelatedRow(primaryRow, targetObjectType);
    const fieldRegistry =
      schema.relatedFieldRegistryByRelationKey?.[relationshipKey];

    if (targetObjectType && coreId) {
      try {
        const relatedResolved = await configObjectsService.resolveObjectInstance(
          tenantId,
          targetObjectType,
          coreId,
        );
        if (relatedResolved) {
          context.entity.relations[relationshipKey] = {
            objectType: targetObjectType,
            coreId,
            instanceId:
              relatedResolved.resolutionMode === 'standalone'
                ? relatedResolved.instanceId
                : null,
            fields: buildEntityFieldsFromResolvedInstance(relatedResolved),
          };
          continue;
        }
      } catch {
        // Fall back to row snapshot below.
      }
    }

    context.entity.relations[relationshipKey] = {
      objectType: targetObjectType,
      coreId: coreId ?? null,
      instanceId: null,
      fields: mapRowToRelationFields(primaryRow, fieldRegistry),
    };
  }
}
