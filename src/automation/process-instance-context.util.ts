import { canonicalizeObjectType } from '../config_objects/core-field-descriptor/object-type-entity.registry';
import { buildSorBoundPlatformEntityRef } from '../events/platform-entity-ref.util';
import type { PlatformEntityRef } from '../events/types';
import { getByPath, setByPath } from '../notifications/context/notification-context-path.util';

export interface ProcessBindingCoreRef {
  objectType: string;
  coreId: number;
}

export interface ProcessContextResolutionParams {
  tenantId: number;
  processInstanceId: number;
  subjectType: string;
  subjectId: number;
  subjectMetadata?: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  bindingCoreRefs?: ProcessBindingCoreRef[];
}

/**
 * Maps a sor_bound object type to the conventional flat process-context key
 * (e.g. customer → customerId).
 */
export function contextStorageKeyForObjectType(objectType: string): string {
  const canonical = canonicalizeObjectType(objectType);
  if (!canonical) {
    return 'coreId';
  }
  return `${canonical}Id`;
}

/**
 * Strips the runtime `context.` prefix when writing to `process_instances.context` JSON.
 */
export function normalizeProcessContextStoragePath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.startsWith('context.')) {
    return trimmed.slice('context.'.length);
  }
  return trimmed;
}

export function mergeBindingCoreIdsIntoProcessContext(
  context: Record<string, unknown> | null | undefined,
  bindings: ProcessBindingCoreRef[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(context ?? {}) };
  for (const binding of bindings) {
    if (!Number.isFinite(binding.coreId) || binding.coreId <= 0) {
      continue;
    }
    const key = contextStorageKeyForObjectType(binding.objectType);
    merged[key] = Math.trunc(binding.coreId);
  }
  return merged;
}

export function buildProcessContextResolutionRoot(
  params: ProcessContextResolutionParams,
): Record<string, unknown> {
  const processContext = params.context ?? {};
  const primaryEntity = pickPrimaryEntityFromBindings(params.bindingCoreRefs);

  return {
    tenantId: params.tenantId,
    process: {
      instanceId: params.processInstanceId,
      context: processContext,
    },
    subject: {
      type: params.subjectType,
      id: params.subjectId,
      metadata: params.subjectMetadata ?? null,
    },
    context: processContext,
    ...(primaryEntity ? { entity: primaryEntity } : {}),
  };
}

function pickPrimaryEntityFromBindings(
  bindings: ProcessBindingCoreRef[] | undefined,
): PlatformEntityRef | undefined {
  if (!bindings?.length) {
    return undefined;
  }
  const latest = bindings[bindings.length - 1];
  if (!latest?.objectType || !latest.coreId) {
    return undefined;
  }
  return buildSorBoundPlatformEntityRef(latest.objectType, latest.coreId);
}

/**
 * Resolves a flat string-mapping child context patch against the parent runtime tree
 * and writes values into the child stored process context (flat keys).
 */
export function resolveChildContextFromParentPatch(
  parentStoredContext: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown> | null | undefined,
  parentResolutionRoot: Record<string, unknown>,
): Record<string, unknown> {
  const child: Record<string, unknown> = { ...(parentStoredContext ?? {}) };

  if (!patch || Object.keys(patch).length === 0) {
    return child;
  }

  const isFlatStringMapping = Object.entries(patch).every(
    ([childPath, parentPath]) =>
      typeof childPath === 'string' &&
      childPath.trim().length > 0 &&
      typeof parentPath === 'string' &&
      parentPath.trim().length > 0,
  );

  if (!isFlatStringMapping) {
    for (const [childPath, value] of Object.entries(patch)) {
      const resolved = resolvePatchValue(value, parentResolutionRoot);
      if (resolved === undefined) {
        continue;
      }
      const storagePath = normalizeProcessContextStoragePath(childPath);
      setByPath(child, storagePath, resolved);
    }
    return child;
  }

  for (const [childPath, parentPath] of Object.entries(patch)) {
    const resolved = getByPath(
      parentResolutionRoot,
      (parentPath as string).trim(),
    );
    if (resolved === undefined) {
      continue;
    }
    const storagePath = normalizeProcessContextStoragePath(childPath);
    setByPath(child, storagePath, resolved);
  }

  return child;
}

function resolvePatchValue(
  value: unknown,
  resolutionRoot: Record<string, unknown>,
): unknown {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { path?: unknown }).path === 'string'
  ) {
    return getByPath(resolutionRoot, (value as { path: string }).path);
  }
  return value;
}
