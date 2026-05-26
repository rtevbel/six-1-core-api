import { ConfigService } from '@nestjs/config';
import {
  PROCESS_CALL_PROCESS_ENABLED_KEY,
  PROCESS_CONFIG_OBJECT_STEPS_ENABLED_KEY,
  PROCESS_SUBJECT_MODEL_ENABLED_KEY,
  PROCESS_TIER2_INSTANCE_SUBJECT_ENABLED_KEY,
  PROCESS_TIER3_WORKFLOW_SUBJECT_ENABLED_KEY,
  PROCESS_TIER1_SCHEDULED_TASK_ENABLED_KEY,
} from './process-feature.constants';

/**
 * Typed feature flags for dynamic-process generalization.
 * All default to `false` until each phase is validated in target environments.
 */
export interface ProcessFeatureFlags {
  subjectModelEnabled: boolean;
  configObjectStepsEnabled: boolean;
  callProcessEnabled: boolean;
  tier2InstanceSubjectEnabled: boolean;
  tier3WorkflowSubjectEnabled: boolean;
  tier1ScheduledTaskEnabled: boolean;
}

const TRUTHY = new Set(['true', '1', 'yes', 'on']);

/**
 * Parses an environment value as boolean. Unset or unknown values → `defaultValue`.
 */
export function parseProcessFeatureFlag(
  raw: string | undefined,
  defaultValue = false,
): boolean {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return TRUTHY.has(String(raw).trim().toLowerCase());
}

/**
 * Loads all process feature flags from ConfigService (env / runtime overrides).
 */
export function loadProcessFeatureFlags(
  configService: ConfigService,
): ProcessFeatureFlags {
  return {
    subjectModelEnabled: parseProcessFeatureFlag(
      configService.get<string>(PROCESS_SUBJECT_MODEL_ENABLED_KEY),
    ),
    configObjectStepsEnabled: parseProcessFeatureFlag(
      configService.get<string>(PROCESS_CONFIG_OBJECT_STEPS_ENABLED_KEY),
    ),
    callProcessEnabled: parseProcessFeatureFlag(
      configService.get<string>(PROCESS_CALL_PROCESS_ENABLED_KEY),
    ),
    tier2InstanceSubjectEnabled: parseProcessFeatureFlag(
      configService.get<string>(PROCESS_TIER2_INSTANCE_SUBJECT_ENABLED_KEY),
    ),
    tier3WorkflowSubjectEnabled: parseProcessFeatureFlag(
      configService.get<string>(PROCESS_TIER3_WORKFLOW_SUBJECT_ENABLED_KEY),
    ),
    tier1ScheduledTaskEnabled: parseProcessFeatureFlag(
      configService.get<string>(PROCESS_TIER1_SCHEDULED_TASK_ENABLED_KEY),
    ),
  };
}
