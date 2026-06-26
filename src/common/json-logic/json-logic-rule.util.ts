import jsonLogic from 'json-logic-js';

/**
 * Returns true when `value` is a plain object suitable as a json-logic rule root.
 */
export function isJsonLogicRule(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0
  );
}

/**
 * Applies a json-logic rule and coerces the result to boolean.
 */
export function applyJsonLogicRule(
  rule: Record<string, unknown>,
  data: unknown,
): boolean {
  return !!jsonLogic.apply(rule, data);
}

export type JsonLogicRuleEvaluation = {
  value: boolean;
  /** False when rule was absent and the default was used. */
  ruleApplied: boolean;
};

/**
 * Applies a rule when present; otherwise returns `defaultWhenAbsent`.
 */
export function evaluateJsonLogicRuleOptional(
  rule: Record<string, unknown> | null | undefined,
  data: unknown,
  defaultWhenAbsent: boolean,
): JsonLogicRuleEvaluation {
  if (!isJsonLogicRule(rule)) {
    return { value: defaultWhenAbsent, ruleApplied: false };
  }
  return { value: applyJsonLogicRule(rule, data), ruleApplied: true };
}
