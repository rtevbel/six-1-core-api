import { RpcException } from '@nestjs/microservices';
import { GLOBAL_SYSTEM_TENANT_ID } from '../../tenants/system-tenant.bootstrap';

export { GLOBAL_SYSTEM_TENANT_ID };

/**
 * Resolves tenant scope for configuration-style APIs.
 *
 * `null` = super-admin / global scope (no tenant filter on reads).
 * Positive integers = tenant-scoped operations.
 */
export function getEffectiveTenantId(
  tenantId: number | null | undefined,
): number | null {
  if (typeof tenantId === 'number' && tenantId > 0) {
    return tenantId;
  }
  return null;
}

/**
 * Stored tenant id for process_templates (system/global uses `0`, not SQL NULL).
 */
export function resolveProcessTemplateStoredTenantId(
  tenantId: number | null | undefined,
): number {
  const effective = getEffectiveTenantId(tenantId);
  return effective ?? GLOBAL_SYSTEM_TENANT_ID;
}

/** True when stored tenant id is the global / super-admin system scope. */
export function isGlobalSystemTenantId(tenantId: number): boolean {
  return tenantId === GLOBAL_SYSTEM_TENANT_ID;
}

/**
 * Validates tenant id for rows stored with `tenant_id` (e.g. custom object instances).
 *
 * Unlike {@link getEffectiveTenantId}, system scope `0` is a valid stored tenant.
 * `null` / omitted / negative values are rejected.
 */
export function resolveStoredTenantId(
  tenantId: number | null | undefined,
): number {
  if (typeof tenantId !== 'number' || !Number.isFinite(tenantId) || tenantId < 0) {
    throw new RpcException('tenantId is required.');
  }
  return tenantId;
}

/**
 * Maps stored instance `tenant_id` to config/template lookup scope.
 *
 * System tenant `0` uses global config scope (`null`). Instance row queries
 * should still use the raw stored id from {@link resolveStoredTenantId}.
 */
export function configScopeTenantId(storedTenantId: number): number | null {
  return isGlobalSystemTenantId(storedTenantId) ? null : storedTenantId;
}

export type ProcessTemplateScopedWhere =
  | { processTemplateId: number }
  | { processTemplateId: number; tenantId: number };

/**
 * When `effectiveTenantId` is null (super-admin), match by template id only.
 * When set, require `tenant_id` to match the tenant.
 */
export function processTemplateWhereForTenantScope(
  processTemplateId: number,
  effectiveTenantId: number | null,
): ProcessTemplateScopedWhere {
  if (effectiveTenantId === null) {
    return { processTemplateId };
  }
  return { processTemplateId, tenantId: effectiveTenantId };
}

/**
 * Returns whether a process-template step is visible under tenant scope.
 * Super-admin scope (`effectiveTenantId === null`) always passes.
 */
export function isProcessTemplateStepTenantAccessible(
  templateTenantId: number | null | undefined,
  effectiveTenantId: number | null,
): boolean {
  if (effectiveTenantId === null) {
    return true;
  }
  return templateTenantId === effectiveTenantId;
}
