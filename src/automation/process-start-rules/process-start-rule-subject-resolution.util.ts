import { getByPath } from '../../notifications/context/notification-context-path.util';
import type { EventEnvelope } from '../../events/types';
import { PROCESS_START_RULE_SUBJECT_ID_WORKFLOW_SELF } from '../../process_start_rules/constants';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../process-subject.constants';

export interface ResolvedProcessStartSubject {
  subjectType: string;
  subjectId: number;
  context: Record<string, unknown>;
}

/**
 * Resolves `subject_id` from a dot-path on the envelope or `workflow_self`.
 */
export function resolveProcessStartSubjectId(
  subjectIdSource: string,
  subjectType: string,
  envelope: EventEnvelope,
): number {
  if (subjectIdSource === PROCESS_START_RULE_SUBJECT_ID_WORKFLOW_SELF) {
    if (subjectType !== PROCESS_SUBJECT_TYPE_WORKFLOW) {
      throw new Error(
        'workflow_self subject_id_source requires subject_type workflow',
      );
    }
    return 0;
  }

  const envelopeRoot = envelope as unknown as Record<string, unknown>;
  const raw = getByPath(envelopeRoot, subjectIdSource);
  const subjectId = Number(raw);
  if (!Number.isFinite(subjectId) || subjectId < 0) {
    throw new Error(
      `subject_id_source "${subjectIdSource}" did not resolve to a non-negative integer`,
    );
  }
  return subjectId;
}

/**
 * Merges static and path-resolved values into process start context.
 * Object values `{ "path": "entity.entityId" }` resolve from the envelope.
 */
export function resolveProcessStartContextPatch(
  patch: Record<string, unknown> | null | undefined,
  envelope: EventEnvelope,
): Record<string, unknown> {
  if (!patch || Object.keys(patch).length === 0) {
    return {};
  }

  const envelopeRoot = envelope as unknown as Record<string, unknown>;
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    resolved[key] = resolveContextPatchValue(value, envelopeRoot);
  }

  return resolved;
}

function resolveContextPatchValue(
  value: unknown,
  envelopeRoot: Record<string, unknown>,
): unknown {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { path?: unknown }).path === 'string'
  ) {
    return getByPath(envelopeRoot, (value as { path: string }).path);
  }
  return value;
}

export function buildResolvedProcessStartSubject(params: {
  subjectType: string;
  subjectIdSource: string;
  contextPatch?: Record<string, unknown> | null;
  envelope: EventEnvelope;
}): ResolvedProcessStartSubject {
  return {
    subjectType: params.subjectType,
    subjectId: resolveProcessStartSubjectId(
      params.subjectIdSource,
      params.subjectType,
      params.envelope,
    ),
    context: resolveProcessStartContextPatch(
      params.contextPatch,
      params.envelope,
    ),
  };
}
