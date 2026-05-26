import type { ConfigCustomObjectInstanceStatus } from '../config_objects/entities/config_custom_object_instance.entity';

const STATUS_RANK: Record<string, number> = {
  DRAFT: 1,
  PUBLISHED: 2,
  ARCHIVED: 3,
};

/** Maps completion-rule minStatus aliases to instance status. */
const MIN_STATUS_ALIASES: Record<string, ConfigCustomObjectInstanceStatus> = {
  draft: 'DRAFT',
  DRAFT: 'DRAFT',
  submitted: 'PUBLISHED',
  published: 'PUBLISHED',
  PUBLISHED: 'PUBLISHED',
  archived: 'ARCHIVED',
  ARCHIVED: 'ARCHIVED',
};

export type CompletionRuleEvaluation = {
  valid: boolean;
  error?: string;
};

function meetsMinStatus(
  actual: string,
  minStatus: ConfigCustomObjectInstanceStatus,
): boolean {
  const actualRank = STATUS_RANK[actual] ?? 0;
  const minRank = STATUS_RANK[minStatus] ?? 0;
  return actualRank >= minRank;
}

function payloadHasContent(payload: Record<string, unknown>): boolean {
  return Object.entries(payload).some(([, value]) => {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value as object).length > 0;
    }
    return true;
  });
}

/**
 * Evaluates a template binding completion_rule against a standalone instance snapshot.
 */
export function evaluateCompletionRule(
  rule: Record<string, unknown> | null | undefined,
  instance: {
    payload: Record<string, unknown>;
    status: string;
  },
): CompletionRuleEvaluation {
  const type = String(rule?.type ?? 'payload_valid');

  if (type !== 'payload_valid') {
    return { valid: false, error: `Unsupported completion rule type: ${type}` };
  }

  const minKey = String(rule?.minStatus ?? 'DRAFT');
  const minStatus = MIN_STATUS_ALIASES[minKey] ?? 'DRAFT';

  if (!meetsMinStatus(instance.status, minStatus)) {
    return {
      valid: false,
      error: `Instance status ${instance.status} does not meet minStatus ${minStatus}`,
    };
  }

  if (!payloadHasContent(instance.payload ?? {})) {
    return { valid: false, error: 'Instance payload is empty' };
  }

  return { valid: true };
}
