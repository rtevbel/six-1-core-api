import type { EventEnvelope } from '../types';

export interface EventEnvelopeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const PLATFORM_EVENT_PREFIX = 'six1-event.';

function isPlatformEventName(eventName: string): boolean {
  return eventName.trim().startsWith(PLATFORM_EVENT_PREFIX);
}

function hasTenantId(tenantId: EventEnvelope['tenantId']): boolean {
  if (tenantId == null || tenantId === '') {
    return false;
  }
  return true;
}

/**
 * Validates a platform event envelope against the P0 contract.
 * Legacy non-`six1-event.*` names are exempt (pre-canonical emissions).
 */
export function validatePlatformEventEnvelope(
  envelope: EventEnvelope,
): EventEnvelopeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isPlatformEventName(envelope.eventName)) {
    return { valid: true, errors, warnings };
  }

  if (!hasTenantId(envelope.tenantId)) {
    warnings.push('tenantId is required for platform events');
  }

  if (!envelope.correlationId?.trim()) {
    warnings.push('correlationId is required for platform events');
  }

  if (!envelope.entity) {
    warnings.push('entity is required for platform events');
  }

  if (envelope.data === undefined || envelope.data === null) {
    warnings.push('data is required for platform events');
  } else if (typeof envelope.data !== 'object' || Array.isArray(envelope.data)) {
    errors.push('data must be a plain object when provided');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
