import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import type { ConfigObjectVerificationFieldMap } from './config-object-verification.constants';

export const CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL = 'verify_email' as const;

export type ConfigVerificationTriggerKey =
  typeof CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL;

export interface ConfigVerificationRuleThen {
  set: Record<string, unknown>;
  emit?: string;
}

export interface ConfigVerificationRuleDefinition {
  when: Record<string, unknown>;
  then: ConfigVerificationRuleThen;
}

/** Builds the default `verify_email` rule from a verification field map (Phase 3). */
export function buildDefaultVerifyEmailRule(
  fieldMap: ConfigObjectVerificationFieldMap,
): ConfigVerificationRuleDefinition {
  return {
    when: {
      and: [
        {
          '==': [
            { var: `record.${fieldMap.tokenField}` },
            { var: 'input.token' },
          ],
        },
        {
          '>': [
            { var: `record.${fieldMap.expiresAtField}` },
            { var: 'now' },
          ],
        },
        { '!': [{ var: `record.${fieldMap.verifiedField}` }] },
      ],
    },
    then: {
      set: {
        [fieldMap.verifiedField]: true,
        [fieldMap.tokenField]: null,
        [fieldMap.expiresAtField]: null,
      },
      emit: PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
    },
  };
}
