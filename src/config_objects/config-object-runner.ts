import { ConfigObjectBindingMode } from './entities/config_object.entity';

/**
 * Discriminator for the unified Object Runner (aligned with product naming).
 * Maps from persisted {@link ConfigObjectBindingMode}: `system_table` → `system_entity`.
 */
export type ConfigObjectRunnerKind =
  | 'sor_bound'
  | 'standalone'
  | 'system_entity';

/**
 * Which identifier `v0.1_resolve_config_instance` accepts for this definition, if any.
 * `none` means use domain REST/RPC only (system tables).
 */
export type ConfigObjectResolveInstanceWithHint = 'coreId' | 'instanceId' | 'none';

/**
 * Where the runner should load form/list field descriptors for this object kind.
 */
export type ConfigObjectFieldSchemaSource =
  | 'sor_plus_custom'
  | 'custom_only'
  | 'external_dto';

export function bindingModeToRunnerKind(
  mode: ConfigObjectBindingMode | undefined,
): ConfigObjectRunnerKind {
  const resolved = mode ?? 'sor_bound';
  return resolved === 'system_table' ? 'system_entity' : resolved;
}

/**
 * Metadata derived from `config_objects.binding_mode` for runtime and gateway clients.
 * Defaults to `sor_bound` when `mode` is missing (defensive for partial mocks/tests).
 */
export function runnerMetadataForBindingMode(
  mode: ConfigObjectBindingMode | undefined,
): {
  runnerKind: ConfigObjectRunnerKind;
  supportsCustomFields: boolean;
  resolveInstanceWith: ConfigObjectResolveInstanceWithHint;
  fieldSchemaSource: ConfigObjectFieldSchemaSource;
} {
  const resolved = mode ?? 'sor_bound';
  switch (resolved) {
    case 'sor_bound':
      return {
        runnerKind: 'sor_bound',
        supportsCustomFields: true,
        resolveInstanceWith: 'coreId',
        fieldSchemaSource: 'sor_plus_custom',
      };
    case 'standalone':
      return {
        runnerKind: 'standalone',
        supportsCustomFields: true,
        resolveInstanceWith: 'instanceId',
        fieldSchemaSource: 'custom_only',
      };
    case 'system_table':
      return {
        runnerKind: 'system_entity',
        supportsCustomFields: false,
        resolveInstanceWith: 'none',
        fieldSchemaSource: 'external_dto',
      };
  }
}
