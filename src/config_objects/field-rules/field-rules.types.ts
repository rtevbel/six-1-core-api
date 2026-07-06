export const FIELD_RULES_SCHEMA_VERSION = 1 as const;

export const FIELD_RULE_OPERATORS = [
  'eq',
  'neq',
  'in',
  'not_in',
  'empty',
  'not_empty',
] as const;

export type FieldRuleOperator = (typeof FIELD_RULE_OPERATORS)[number];

export interface FieldRuleWhenClause {
  field: string;
  operator: FieldRuleOperator;
  value?: unknown;
}

export interface FieldRuleThenClause {
  visible?: boolean;
  required?: boolean;
  readonly?: boolean;
}

export interface FieldRuleCondition {
  when: FieldRuleWhenClause;
  then: FieldRuleThenClause;
}

/**
 * Cross-field rule payload stored in `config_object_field_rules.rules_json`.
 * Base columns (`is_visible`, `is_readonly`, `is_required`) apply unconditionally;
 * `conditions` add field-driven overrides at runtime.
 */
export interface FieldRulesJson {
  schemaVersion?: typeof FIELD_RULES_SCHEMA_VERSION;
  when?: FieldRuleWhenClause;
  then?: FieldRuleThenClause;
  conditions?: FieldRuleCondition[];
}
