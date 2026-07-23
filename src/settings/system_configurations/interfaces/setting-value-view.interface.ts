import { SystemSettingValueType } from '../constants';

/**
 * Public view of a stored or resolved setting value (secrets masked unless decrypted).
 */
export interface SystemSettingValueView {
  definitionId: number;
  settingKey: string;
  groupKey: string;
  valueType: SystemSettingValueType;
  tenantId: number;
  /** Effective or stored value; secrets are masked unless includeSecrets. */
  value: unknown;
  isSecret: boolean;
  isMasked: boolean;
  source?: 'tenant_override' | 'global' | 'default';
  valueId?: number;
  updatedAt?: Date;
}

/**
 * Resolve response: settings grouped by group_key.
 */
export interface ResolveSystemSettingsResult {
  tenantId: number | null;
  groups: Record<string, Record<string, SystemSettingValueView>>;
}
