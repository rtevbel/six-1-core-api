import type { NotificationBuildInput } from './notification-context.types';
import {
  type NormalizedNotificationContextSource,
  parseOptionalPositiveInt,
} from './notification-context-source.util';

export interface NormalizedProcessRef {
  processInstanceId: number | null;
  stepInstanceId: number | null;
  stepName: string | null;
  stepOrder: number | null;
  processTemplateId: number | null;
  stepStatus: string | null;
  processStatus: string | null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeEntityType(entityType?: unknown): string | null {
  if (typeof entityType !== 'string' || !entityType.trim()) {
    return null;
  }
  return entityType.toLowerCase().replace(/entity$/, '');
}

function readEnvelopeEntity(
  input: NotificationBuildInput,
): Record<string, unknown> | null {
  if (input.source.kind !== 'envelope' || !input.source.envelope.entity) {
    return null;
  }

  const entity = input.source.envelope.entity;
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
    return null;
  }

  return entity as Record<string, unknown>;
}

/**
 * Resolves process/step identifiers from refs, payload, and envelope entity.
 */
export function resolveProcessRef(
  input: NotificationBuildInput,
  source: NormalizedNotificationContextSource,
): NormalizedProcessRef {
  const payload = source.payload;

  let processInstanceId =
    input.refs?.processInstanceId ??
    parseOptionalPositiveInt(payload.processInstanceId) ??
    parseOptionalPositiveInt(payload.process_instance_id);

  let stepInstanceId =
    input.refs?.stepInstanceId ??
    parseOptionalPositiveInt(payload.stepInstanceId) ??
    parseOptionalPositiveInt(payload.step_instance_id);

  const envelopeEntity = readEnvelopeEntity(input);
  if (envelopeEntity) {
    const entityType = normalizeEntityType(envelopeEntity.entityType);
    const entityId = parseOptionalPositiveInt(envelopeEntity.entityId);

    if (
      (entityType === 'processstep' || entityType === 'process_step') &&
      entityId
    ) {
      stepInstanceId = stepInstanceId ?? entityId;
    }

    if (
      (entityType === 'processinstance' || entityType === 'process_instance') &&
      entityId
    ) {
      processInstanceId = processInstanceId ?? entityId;
    }
  }

  const sourceEntityType = normalizeEntityType(source.entityType);
  if (
    (sourceEntityType === 'processstep' || sourceEntityType === 'process_step') &&
    source.entityId
  ) {
    stepInstanceId = stepInstanceId ?? source.entityId;
  }

  if (
    (sourceEntityType === 'processinstance' ||
      sourceEntityType === 'process_instance') &&
    source.entityId
  ) {
    processInstanceId = processInstanceId ?? source.entityId;
  }

  return {
    processInstanceId,
    stepInstanceId,
    stepName:
      readString(payload.stepName) ?? readString(payload.step_name) ?? null,
    stepOrder:
      parseOptionalPositiveInt(payload.stepOrder) ??
      parseOptionalPositiveInt(payload.step_order),
    processTemplateId:
      parseOptionalPositiveInt(payload.processTemplateId) ??
      parseOptionalPositiveInt(payload.process_template_id),
    stepStatus:
      readString(payload.stepStatus) ??
      readString(payload.step_status) ??
      readString(payload.status),
    processStatus:
      readString(payload.processStatus) ??
      readString(payload.process_status),
  };
}
