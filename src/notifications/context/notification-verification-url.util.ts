import type { NotificationContext } from './notification-context.types';
import type { NormalizedNotificationContextSource } from './notification-context-source.util';

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Resolves verification token from event payload and hydrated entity fields.
 */
export function readVerificationTokenForUrl(
  payload: Record<string, unknown>,
  entityFields?: Record<string, unknown>,
): string | null {
  return (
    readNonEmptyString(payload.verificationToken) ??
    readNonEmptyString(payload.verification_token) ??
    readNonEmptyString(payload.token) ??
    readNonEmptyString(entityFields?.verification_token) ??
    readNonEmptyString(entityFields?.verificationToken)
  );
}

/**
 * Resolves config object type for verification URL building.
 */
export function readVerificationObjectTypeForUrl(
  payload: Record<string, unknown>,
  context: Pick<NotificationContext, 'workflow' | 'entity'>,
  source?: Pick<NormalizedNotificationContextSource, 'entityType'> | null,
): string | null {
  return (
    readNonEmptyString(payload.objectType) ??
    readNonEmptyString(payload.object_type) ??
    readNonEmptyString(context.entity.objectType) ??
    readNonEmptyString(context.workflow.subjectType) ??
    readNonEmptyString(source?.entityType)
  );
}
