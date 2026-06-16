import { pathStartsWith } from './notification-context-path.util';

const ENTITY_HYDRATION_PREFIXES = [
  'entity.fields',
  'entity.relations',
] as const;

const PROCESS_HYDRATION_PREFIX = 'process';
const WORKFLOW_HYDRATION_PREFIX = 'workflow';

/**
 * Returns true when template paths require config-object entity hydration (NV2+).
 */
export function shouldHydrateEntityNamespace(
  requiredPaths?: string[],
): boolean {
  if (!requiredPaths?.length) {
    return false;
  }

  return requiredPaths.some((path) =>
    ENTITY_HYDRATION_PREFIXES.some((prefix) => pathStartsWith(path, prefix)),
  );
}

/**
 * Returns true when template paths require `process.*` hydration (NV3+).
 */
export function shouldHydrateProcessNamespace(
  requiredPaths?: string[],
): boolean {
  if (!requiredPaths?.length) {
    return false;
  }

  return requiredPaths.some((path) =>
    pathStartsWith(path, PROCESS_HYDRATION_PREFIX),
  );
}

/**
 * Returns true when template paths require `workflow.*` hydration (NV3+).
 */
export function shouldHydrateWorkflowNamespace(
  requiredPaths?: string[],
): boolean {
  if (!requiredPaths?.length) {
    return false;
  }

  return requiredPaths.some((path) =>
    pathStartsWith(path, WORKFLOW_HYDRATION_PREFIX),
  );
}
