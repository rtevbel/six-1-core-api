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
  return effective ?? 0;
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
