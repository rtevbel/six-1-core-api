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
  const workflowContext = context.workflow.context ?? {};
  const hasCustomerRef =
    parseOptionalPositiveInt(workflowContext.customerId) != null ||
    parseOptionalPositiveInt(workflowContext.customer_id) != null ||
    parseOptionalPositiveInt(payload.customerCoreId) != null ||
    parseOptionalPositiveInt(payload.customer_core_id) != null ||
    parseOptionalPositiveInt(payload.customerId) != null ||
    parseOptionalPositiveInt(payload.customer_id) != null;

  if (hasCustomerRef) {
    return 'customer';
  }

  const entityObjectType = readNonEmptyString(context.entity.objectType);
  if (entityObjectType && entityObjectType !== 'workflow') {
    return entityObjectType;
  }

  const payloadObjectType =
    readNonEmptyString(payload.objectType) ??
    readNonEmptyString(payload.object_type);
  if (payloadObjectType && payloadObjectType !== 'workflow') {
    return payloadObjectType;
  }

  const workflowSubjectType = readNonEmptyString(context.workflow.subjectType);
  if (workflowSubjectType && workflowSubjectType !== 'workflow') {
    return workflowSubjectType;
  }

  return readNonEmptyString(source?.entityType);
}

function parseOptionalPositiveInt(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.trunc(parsed);
}
