import type { EventPayloadSchema } from '../interfaces/event-payload-schema.interface';

function inferJsonSchemaPropertyType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('id') && lower !== 'externalid') {
    return 'number';
  }
  if (lower.includes('date') || lower.endsWith('at')) {
    return 'string';
  }
  if (lower.startsWith('is') || lower.startsWith('has')) {
    return 'boolean';
  }
  return 'string';
}

/**
 * Builds a minimal JSON Schema object from EventVars required/optional keys.
 */
export function buildPayloadSchemaFromEventVarKeys(
  required: string[] = [],
  optional: string[] = [],
): EventPayloadSchema {
  const properties: Record<string, { type: string }> = {};
  for (const key of [...required, ...optional]) {
    properties[key] = { type: inferJsonSchemaPropertyType(key) };
  }
  return {
    type: 'object',
    properties,
    required,
  };
}

/** Shared process lifecycle payload fields emitted by the orchestrator. */
export const PROCESS_STEP_PAYLOAD_SCHEMA: EventPayloadSchema = {
  type: 'object',
  properties: {
    processInstanceId: { type: 'number' },
    stepInstanceId: { type: 'number' },
    stepOrder: { type: 'number' },
    stepName: { type: 'string' },
    processTemplateId: { type: 'number' },
    cause: { type: 'string' },
    assigneeId: { type: 'number' },
    assigneeIds: { type: 'array', items: { type: 'number' } },
  },
};

export const PROCESS_INSTANCE_PAYLOAD_SCHEMA: EventPayloadSchema = {
  type: 'object',
  properties: {
    processInstanceId: { type: 'number' },
    processTemplateId: { type: 'number' },
    correlationId: { type: 'string' },
    cause: { type: 'string' },
  },
};

export const CONFIG_OBJECT_INSTANCE_PAYLOAD_SCHEMA: EventPayloadSchema = {
  type: 'object',
  properties: {
    configCustomObjectInstanceId: { type: 'number' },
    configObjectId: { type: 'number' },
    objectType: { type: 'string' },
    tenantId: { type: 'number' },
    updatedBy: { type: 'number' },
    status: { type: 'string' },
    changedFields: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

export const SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA: EventPayloadSchema = {
  type: 'object',
  properties: {
    objectType: { type: 'string' },
    resolutionMode: { type: 'string', enum: ['sor_bound'] },
    coreId: { type: 'number' },
    tenantId: { type: 'number' },
    changedFields: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['objectType', 'resolutionMode', 'coreId', 'tenantId'],
};

export const SYSTEM_ENTITY_UPDATED_PAYLOAD_SCHEMA: EventPayloadSchema = {
  type: 'object',
  properties: {
    objectType: { type: 'string' },
    resolutionMode: { type: 'string', enum: ['system_table'] },
    entityId: { type: 'number' },
    coreId: { type: 'number' },
    tenantId: { type: 'number' },
    changedFields: {
      type: 'array',
      items: { type: 'string' },
    },
    updatedBy: { type: 'number' },
  },
  required: ['objectType', 'resolutionMode', 'entityId', 'coreId'],
};
