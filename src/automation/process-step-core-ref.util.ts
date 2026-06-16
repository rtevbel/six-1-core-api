import { PROCESS_SUBJECT_TYPE_PROJECT } from './process-subject.constants';
import { PROCESS_SUBJECT_TYPE_SOR_ENTITY } from './process-subject.constants';

export interface ProcessStepAnchorContext {
  subjectType: string;
  subjectId: number;
  subjectMetadata: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return Math.trunc(n);
}

function readCoreIdFromRecord(
  record: Record<string, unknown>,
  objectType: string,
): number | null {
  const camelKey = `${objectType}Id`;
  const snakeKey = `${objectType.replace(/([A-Z])/g, '_$1').toLowerCase()}_id`;

  for (const key of [camelKey, snakeKey, 'coreId', 'core_id', 'entityId', 'entity_id']) {
    const parsed = parsePositiveInt(record[key]);
    if (parsed) {
      return parsed;
    }
  }

  const recordObjectType = String(record.objectType ?? record.object_type ?? '');
  if (recordObjectType === objectType) {
    return parsePositiveInt(record.coreId ?? record.core_id ?? record.entityId);
  }

  return null;
}

/**
 * Resolves a SoR / system_table core row id for a step binding from process anchor data.
 */
export function resolveCoreIdForObjectType(
  anchor: ProcessStepAnchorContext,
  objectType: string,
): number | null {
  if (anchor.subjectType === PROCESS_SUBJECT_TYPE_SOR_ENTITY) {
    const meta = anchor.subjectMetadata ?? {};
    const metaObjectType = String(meta.objectType ?? meta.object_type ?? '');
    const metaCoreId = parsePositiveInt(
      meta.coreId ?? meta.core_id ?? anchor.subjectId,
    );
    if (metaCoreId && (!metaObjectType || metaObjectType === objectType)) {
      return metaCoreId;
    }
  }

  if (
    anchor.subjectType === PROCESS_SUBJECT_TYPE_PROJECT &&
    objectType === 'project'
  ) {
    return parsePositiveInt(anchor.subjectId);
  }

  if (objectType === 'tenant') {
    const tenantFromContext = parsePositiveInt(
      anchor.context?.tenantId ?? anchor.context?.tenant_id,
    );
    if (tenantFromContext) {
      return tenantFromContext;
    }
    const tenantFromMeta = parsePositiveInt(
      anchor.subjectMetadata?.tenantId ?? anchor.subjectMetadata?.tenant_id,
    );
    if (tenantFromMeta) {
      return tenantFromMeta;
    }
  }

  for (const source of [anchor.context, anchor.subjectMetadata]) {
    if (!source) {
      continue;
    }
    const coreId = readCoreIdFromRecord(source, objectType);
    if (coreId) {
      return coreId;
    }
  }

  return null;
}

/**
 * Resolves a standalone custom object instance id from process anchor data (`use_existing`).
 */
export function resolveStandaloneInstanceIdForObjectType(
  anchor: ProcessStepAnchorContext,
  objectType: string,
): number | null {
  for (const source of [anchor.context, anchor.subjectMetadata]) {
    if (!source) {
      continue;
    }

    const instanceId = parsePositiveInt(
      source.configCustomObjectInstanceId ??
        source.config_custom_object_instance_id ??
        source.instanceId ??
        source.instance_id,
    );
    if (instanceId) {
      return instanceId;
    }

    const sourceObjectType = String(source.objectType ?? source.object_type ?? '');
    if (sourceObjectType === objectType) {
      const typedInstanceId = parsePositiveInt(
        source.instanceId ?? source.instance_id,
      );
      if (typedInstanceId) {
        return typedInstanceId;
      }
    }
  }

  return null;
}

export function isCoreLinkedConfigBindingMode(
  bindingMode: string | null | undefined,
): boolean {
  return bindingMode === 'sor_bound' || bindingMode === 'system_table';
}
