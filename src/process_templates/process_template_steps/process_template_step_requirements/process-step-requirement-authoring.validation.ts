import { RpcException } from '@nestjs/microservices';
import {
  ALLOWED_PROCESS_STEP_REQUIREMENT_TYPES,
  LEGACY_FIELD_FORM_REQUIREMENT_TYPES,
  PROCESS_STEP_REQUIREMENT_FIELD_FORM_OVERLAP_MESSAGE,
  PROCESS_STEP_REQUIREMENT_TYPE_NOT_ALLOWED_MESSAGE,
  REQUIREMENT_GATE_METADATA_PROPERTY_KEYS,
} from './process-step-requirement-policy.constants';
import { DEFAULT_COMPLETION_RULE } from '../../../automation/process-step-object-binding.constants';

export type StepBindingFieldSnapshot = {
  configObjectId: number;
  objectType: string;
  fieldKeys: string[];
};

export type RequirementAuthoringInput = {
  processTemplateStepId: number;
  requirementType: string;
  requirementKey: string;
  jsonSchema: unknown;
};

/**
 * Returns true when `requirementType` is an allowed non-field gate type.
 */
export function isAllowedRequirementType(requirementType: string): boolean {
  const normalized = requirementType.trim().toLowerCase();
  return (ALLOWED_PROCESS_STEP_REQUIREMENT_TYPES as readonly string[]).includes(
    normalized,
  );
}

/**
 * Heuristic: JSON schema collects business field data (form) vs small gate metadata.
 */
export function looksLikeFieldFormJsonSchema(
  jsonSchema: unknown,
  requirementType?: string,
): boolean {
  const typeNormalized = requirementType?.trim().toLowerCase() ?? '';
  if (
    (LEGACY_FIELD_FORM_REQUIREMENT_TYPES as readonly string[]).includes(
      typeNormalized,
    )
  ) {
    return true;
  }

  const propertyKeys = extractRequirementSchemaPropertyKeys(jsonSchema);
  const dataPropertyKeys = propertyKeys.filter(
    (key) => !REQUIREMENT_GATE_METADATA_PROPERTY_KEYS.has(normalizeKey(key)),
  );

  if (dataPropertyKeys.length >= 2) {
    return true;
  }

  if (dataPropertyKeys.length === 1) {
    const defs = extractRequirementSchemaProperties(jsonSchema);
    const lone = defs[dataPropertyKeys[0]!];
    if (lone && isComplexInputProperty(lone)) {
      return true;
    }
  }

  const envelope = asRecord(jsonSchema);
  if (envelope?.formFields || envelope?.fields || envelope?.uiSchema) {
    return true;
  }

  return false;
}

/**
 * True when requirement key / schema property names overlap a step binding's object.
 */
export function requirementOverlapsStepBinding(
  input: RequirementAuthoringInput,
  bindings: StepBindingFieldSnapshot[],
): boolean {
  if (!bindings.length) {
    return false;
  }

  const requirementKeyNorm = normalizeKey(input.requirementKey);
  const schemaKeys = new Set(
    extractRequirementSchemaPropertyKeys(input.jsonSchema).map(normalizeKey),
  );

  for (const binding of bindings) {
    const objectTypeNorm = normalizeKey(binding.objectType);
    if (
      requirementKeyNorm === objectTypeNorm ||
      requirementKeyNorm.includes(objectTypeNorm) ||
      objectTypeNorm.includes(requirementKeyNorm)
    ) {
      return true;
    }

    const bindingFieldNorms = new Set(
      binding.fieldKeys.map((key) => normalizeKey(key)),
    );

    for (const schemaKey of schemaKeys) {
      if (bindingFieldNorms.has(schemaKey)) {
        return true;
      }
    }

    if (
      schemaKeys.size >= 2 &&
      bindingFieldNorms.size >= 2 &&
      intersectionSize(schemaKeys, bindingFieldNorms) >= 2
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validates requirement authoring when gate policy is enforced.
 */
export function assertProcessTemplateStepRequirementAuthoringAllowed(
  input: RequirementAuthoringInput,
  bindings: StepBindingFieldSnapshot[],
): void {
  if (!isAllowedRequirementType(input.requirementType)) {
    throw new RpcException(PROCESS_STEP_REQUIREMENT_TYPE_NOT_ALLOWED_MESSAGE);
  }

  if (
    looksLikeFieldFormJsonSchema(input.jsonSchema, input.requirementType) &&
    requirementOverlapsStepBinding(input, bindings)
  ) {
    throw new RpcException(PROCESS_STEP_REQUIREMENT_FIELD_FORM_OVERLAP_MESSAGE);
  }
}

export type RequirementToBindingSuggestion = {
  processTemplateStepRequirementId: number;
  processTemplateStepId: number;
  requirementKey: string;
  requirementType: string;
  suggestedConfigObjectId: number | null;
  suggestedObjectType: string | null;
  suggestedBinding: {
    bindingMode: 'create_on_enter';
    completionRule: Record<string, unknown>;
    isMandatory: boolean;
    instanceLabelTemplate: string | null;
  };
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  fieldKeyOverlap: string[];
};

/**
 * Suggests an object binding + completion_rule from a legacy field-form requirement.
 */
export function suggestRequirementToBinding(params: {
  processTemplateStepRequirementId: number;
  processTemplateStepId: number;
  requirementType: string;
  requirementKey: string;
  jsonSchema: unknown;
  bindings: StepBindingFieldSnapshot[];
  tenantConfigObjects?: Array<{
    configObjectId: number;
    objectType: string;
    fieldKeys: string[];
  }>;
}): RequirementToBindingSuggestion | null {
  if (
    !looksLikeFieldFormJsonSchema(params.jsonSchema, params.requirementType)
  ) {
    return null;
  }

  const schemaKeys = extractRequirementSchemaPropertyKeys(params.jsonSchema);
  const keyNorm = normalizeKey(params.requirementKey);

  let match = params.tenantConfigObjects?.find(
    (obj) => normalizeKey(obj.objectType) === keyNorm,
  );

  if (!match) {
    for (const binding of params.bindings) {
      const candidate = params.tenantConfigObjects?.find(
        (obj) => obj.configObjectId === binding.configObjectId,
      );
      if (candidate) {
        match = candidate;
        break;
      }
    }
  }

  if (!match && params.tenantConfigObjects?.length) {
    let best: { obj: (typeof params.tenantConfigObjects)[number]; overlap: number } | null =
      null;
    for (const obj of params.tenantConfigObjects) {
      const overlap = intersectionSize(
        new Set(schemaKeys.map(normalizeKey)),
        new Set(obj.fieldKeys.map(normalizeKey)),
      );
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = { obj, overlap };
      }
    }
    match = best?.obj;
  }

  const fieldKeyOverlap =
    match && schemaKeys.length
      ? schemaKeys.filter((key) =>
          match!.fieldKeys.map(normalizeKey).includes(normalizeKey(key)),
        )
      : [];

  const envelope = asRecord(params.jsonSchema);
  const autoApprove = envelope?.autoApproveOnValid === true;
  const completionRule: Record<string, unknown> = autoApprove
    ? { type: 'payload_valid', minStatus: 'PUBLISHED' }
    : { ...DEFAULT_COMPLETION_RULE };

  const confidence: RequirementToBindingSuggestion['confidence'] = match
    ? fieldKeyOverlap.length >= 2 || normalizeKey(match.objectType) === keyNorm
      ? 'high'
      : 'medium'
    : 'low';

  return {
    processTemplateStepRequirementId: params.processTemplateStepRequirementId,
    processTemplateStepId: params.processTemplateStepId,
    requirementKey: params.requirementKey,
    requirementType: params.requirementType,
    suggestedConfigObjectId: match?.configObjectId ?? null,
    suggestedObjectType: match?.objectType ?? null,
    suggestedBinding: {
      bindingMode: 'create_on_enter',
      completionRule,
      isMandatory: true,
      instanceLabelTemplate: params.requirementKey,
    },
    confidence,
    reason: match
      ? `Requirement "${params.requirementKey}" overlaps config object "${match.objectType}"; bind the object and use completion_rule instead.`
      : `Requirement "${params.requirementKey}" looks like a field form; create or select a config object binding.`,
    fieldKeyOverlap,
  };
}

function extractRequirementSchemaPropertyKeys(jsonSchema: unknown): string[] {
  const properties = extractRequirementSchemaProperties(jsonSchema);
  return Object.keys(properties);
}

function extractRequirementSchemaProperties(
  jsonSchema: unknown,
): Record<string, Record<string, unknown>> {
  const root = asRecord(jsonSchema);
  if (!root) {
    return {};
  }

  const schema = asRecord(root.schema) ?? root;
  const properties = asRecord(schema.properties);
  if (!properties) {
    return {};
  }

  const result: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(properties)) {
    const prop = asRecord(value);
    if (prop) {
      result[key] = prop;
    }
  }
  return result;
}

function isComplexInputProperty(prop: Record<string, unknown>): boolean {
  const type = String(prop.type ?? '');
  if (type === 'array' || type === 'object') {
    return true;
  }
  if (prop.format === 'email' || prop.format === 'uri' || prop.format === 'date') {
    return true;
  }
  if (prop.items || prop.properties) {
    return true;
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const entry of a) {
    if (b.has(entry)) {
      count += 1;
    }
  }
  return count;
}
