import {
  FIELD_RULE_OPERATORS,
  FIELD_RULES_SCHEMA_VERSION,
  type FieldRuleCondition,
  type FieldRuleOperator,
  type FieldRulesJson,
  type FieldRuleThenClause,
  type FieldRuleWhenClause,
} from './field-rules.types';

export class FieldRulesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldRulesValidationError';
  }
}

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'schemaVersion',
  'when',
  'then',
  'conditions',
]);

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new FieldRulesValidationError(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new FieldRulesValidationError(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertFieldKey(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new FieldRulesValidationError(`${label}.field must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new FieldRulesValidationError(`${label}.field must be non-empty`);
  }
  return trimmed;
}

function assertOperator(value: unknown, label: string): FieldRuleOperator {
  if (typeof value !== 'string') {
    throw new FieldRulesValidationError(`${label}.operator must be a string`);
  }
  if (!FIELD_RULE_OPERATORS.includes(value as FieldRuleOperator)) {
    throw new FieldRulesValidationError(
      `${label}.operator must be one of: ${FIELD_RULE_OPERATORS.join(', ')}`,
    );
  }
  return value as FieldRuleOperator;
}

function validateWhenClause(
  raw: unknown,
  label: string,
): FieldRuleWhenClause {
  const o = assertPlainObject(raw, label);
  const allowed = new Set(['field', 'operator', 'value']);
  for (const key of Object.keys(o)) {
    if (!allowed.has(key)) {
      throw new FieldRulesValidationError(`${label}: unknown key "${key}"`);
    }
  }

  const field = assertFieldKey(o.field, label);
  const operator = assertOperator(o.operator, label);

  if (operator === 'empty' || operator === 'not_empty') {
    if (Object.prototype.hasOwnProperty.call(o, 'value')) {
      throw new FieldRulesValidationError(
        `${label}.value must not be set for operator "${operator}"`,
      );
    }
    return { field, operator };
  }

  if (operator === 'in' || operator === 'not_in') {
    if (!Array.isArray(o.value)) {
      throw new FieldRulesValidationError(
        `${label}.value must be an array for operator "${operator}"`,
      );
    }
    return { field, operator, value: o.value };
  }

  if (!Object.prototype.hasOwnProperty.call(o, 'value')) {
    throw new FieldRulesValidationError(
      `${label}.value is required for operator "${operator}"`,
    );
  }

  return { field, operator, value: o.value };
}

function validateThenClause(
  raw: unknown,
  label: string,
): FieldRuleThenClause {
  const o = assertPlainObject(raw, label);
  const allowed = new Set(['visible', 'required', 'readonly']);
  for (const key of Object.keys(o)) {
    if (!allowed.has(key)) {
      throw new FieldRulesValidationError(`${label}: unknown key "${key}"`);
    }
  }

  const out: FieldRuleThenClause = {};
  for (const key of ['visible', 'required', 'readonly'] as const) {
    if (Object.prototype.hasOwnProperty.call(o, key)) {
      if (typeof o[key] !== 'boolean') {
        throw new FieldRulesValidationError(
          `${label}.${key} must be a boolean`,
        );
      }
      out[key] = o[key] as boolean;
    }
  }

  if (Object.keys(out).length === 0) {
    throw new FieldRulesValidationError(
      `${label} must include at least one of visible, required, readonly`,
    );
  }

  return out;
}

function validateCondition(raw: unknown, index: number): FieldRuleCondition {
  const label = `conditions[${index}]`;
  const o = assertPlainObject(raw, label);
  const allowed = new Set(['when', 'then']);
  for (const key of Object.keys(o)) {
    if (!allowed.has(key)) {
      throw new FieldRulesValidationError(`${label}: unknown key "${key}"`);
    }
  }
  if (!Object.prototype.hasOwnProperty.call(o, 'when')) {
    throw new FieldRulesValidationError(`${label}.when is required`);
  }
  if (!Object.prototype.hasOwnProperty.call(o, 'then')) {
    throw new FieldRulesValidationError(`${label}.then is required`);
  }

  return {
    when: validateWhenClause(o.when, `${label}.when`),
    then: validateThenClause(o.then, `${label}.then`),
  };
}

/**
 * Validates and normalizes cross-field `rulesJson` on field-rule save.
 * Empty objects are allowed (no cross-field conditions).
 */
export function validateFieldRulesJson(value: unknown): FieldRulesJson | null {
  if (value === undefined || value === null) {
    return null;
  }

  const o = assertPlainObject(value, 'rulesJson');
  for (const key of Object.keys(o)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      throw new FieldRulesValidationError(`rulesJson: unknown key "${key}"`);
    }
  }

  if (Object.keys(o).length === 0) {
    return {};
  }

  if (
    Object.prototype.hasOwnProperty.call(o, 'schemaVersion') &&
    (typeof o.schemaVersion !== 'number' ||
      !Number.isInteger(o.schemaVersion) ||
      o.schemaVersion !== FIELD_RULES_SCHEMA_VERSION)
  ) {
    throw new FieldRulesValidationError(
      `rulesJson.schemaVersion must be ${FIELD_RULES_SCHEMA_VERSION}`,
    );
  }

  const out: FieldRulesJson = {};

  if (Object.prototype.hasOwnProperty.call(o, 'schemaVersion')) {
    out.schemaVersion = FIELD_RULES_SCHEMA_VERSION;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'when')) {
    out.when = validateWhenClause(o.when, 'rulesJson.when');
  }
  if (Object.prototype.hasOwnProperty.call(o, 'then')) {
    out.then = validateThenClause(o.then, 'rulesJson.then');
  }

  if (out.when && !out.then) {
    throw new FieldRulesValidationError('rulesJson.then is required when when is set');
  }
  if (out.then && !out.when) {
    throw new FieldRulesValidationError('rulesJson.when is required when then is set');
  }

  if (Object.prototype.hasOwnProperty.call(o, 'conditions')) {
    if (!Array.isArray(o.conditions)) {
      throw new FieldRulesValidationError('rulesJson.conditions must be an array');
    }
    out.conditions = o.conditions.map((item, index) =>
      validateCondition(item, index),
    );
  }

  if (
    !out.when &&
    !out.then &&
    (!out.conditions || out.conditions.length === 0)
  ) {
    throw new FieldRulesValidationError(
      'rulesJson must include when/then or a non-empty conditions array',
    );
  }

  if (out.when || out.then || (out.conditions && out.conditions.length > 0)) {
    out.schemaVersion = FIELD_RULES_SCHEMA_VERSION;
  }

  return out;
}
