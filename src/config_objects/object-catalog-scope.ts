import type { ConfigObjectBindingMode } from './entities/config_object.entity';
import {
  canonicalizeObjectType,
  resolveEntityClassForObjectType,
} from './core-field-descriptor/object-type-entity.registry';
import { getMetadataArgsStorage } from 'typeorm';

/**
 * Canonical object type naming for authoring/runtime catalogs.
 *
 * Keep these values aligned with TypeORM `@Entity('<table_name>')` names and
 * persisted `config_objects.object_type` values.
 */
export type ConfigObjectType = string;

/**
 * Pure membership / pivot tables should not be treated as standalone object
 * catalogs. They are represented through relation catalogs and manifests.
 */
export const JUNCTION_ONLY_OBJECT_TYPES = [
  'role_permissions',
  'user_roles',
  'tenant_user_roles',
  'tenant_team_members',
  'tenant_team_projects',
  'customer_project_members',
  'customer_task_members',
] as const;

/**
 * Stable platform / identity / workflow tables that should default to
 * `system_table` when generating the unified field catalog.
 *
 * Descriptions and meta-style helper tables are intentionally included when they
 * are first-class parts of the modeled object graph (for example inline relation
 * blocks such as `role_descriptions`).
 */
export const SYSTEM_TABLE_OBJECT_TYPES = [
  // Identity & tenant
  'users',
  'user_meta',
  'tenants',
  'tenant_meta',
  'tenant_users',
  'tenant_user_meta',
  'tenant_types',
  'tenant_configurations',
  'tenant_working_hours',
  'tenant_off_days',
  'tenant_user_configurations',
  'tenant_user_working_hours',
  'tenant_user_off_days',
  'tenant_teams',

  // Security & system config
  'roles',
  'role_descriptions',
  'permissions',
  'permission_descriptions',
  'system_statuses',
  'system_languages',

  // Workflow engine
  'process_templates',
  'process_template_descriptions',
  'process_template_categories',
  'process_template_steps',
  'process_template_step_descriptions',
  'process_template_step_requirements',
  'process_template_step_object_bindings',
  'process_template_step_trigger_conditions',
  'process_template_step_requirement_submissions',
  'process_template_step_trigger_condition_submissions',
  'process_instances',
  'process_instance_steps',
  'process_instance_step_requirements',
  'process_instance_step_object_instances',
  'process_instance_step_requirement_submissions',
  'process_instance_step_triggers',

  // Platform events & notifications (Runner admin)
  'event_notification_rules',
  'platform_actions',
  'action_bindings',
  'platform_event_records',
] as const;

const JUNCTION_ONLY_OBJECT_TYPE_SET = new Set<string>(JUNCTION_ONLY_OBJECT_TYPES);
const SYSTEM_TABLE_OBJECT_TYPE_SET = new Set<string>(SYSTEM_TABLE_OBJECT_TYPES);

export function isJunctionOnlyObjectType(objectType: ConfigObjectType): boolean {
  return JUNCTION_ONLY_OBJECT_TYPE_SET.has(objectType);
}

export function isSystemTableObjectType(objectType: ConfigObjectType): boolean {
  const normalized = objectType.trim().toLowerCase();
  if (SYSTEM_TABLE_OBJECT_TYPE_SET.has(normalized)) {
    return true;
  }

  const canonical = canonicalizeObjectType(objectType);
  if (SYSTEM_TABLE_OBJECT_TYPE_SET.has(canonical)) {
    return true;
  }

  const entityClass = resolveEntityClassForObjectType(canonical);
  if (!entityClass) {
    return false;
  }

  const table = getMetadataArgsStorage().tables.find(
    (tableMetadata) => tableMetadata.target === entityClass,
  );
  return Boolean(
    table?.name && SYSTEM_TABLE_OBJECT_TYPE_SET.has(String(table.name)),
  );
}

/**
 * Default binding inference for bulk catalog generation.
 *
 * - Pure junction tables are not standalone catalogs.
 * - Explicit stable platform tables default to `system_table`.
 * - Remaining entities default to `sor_bound` until promoted otherwise.
 */
export function inferDefaultBindingModeForObjectType(
  objectType: ConfigObjectType,
): ConfigObjectBindingMode | null {
  if (isJunctionOnlyObjectType(objectType)) {
    return null;
  }
  if (isSystemTableObjectType(objectType)) {
    return 'system_table';
  }
  return 'sor_bound';
}
