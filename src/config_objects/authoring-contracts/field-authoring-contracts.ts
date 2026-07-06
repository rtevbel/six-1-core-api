/**
 * Published field authoring contracts (P5) for gateway / Object Designer consumers.
 */

export {
  FIELD_RULES_SCHEMA_VERSION,
  FIELD_RULE_OPERATORS,
  type FieldRuleCondition,
  type FieldRuleOperator,
  type FieldRulesJson,
  type FieldRuleThenClause,
  type FieldRuleWhenClause,
} from '../field-rules';

export {
  FIELD_VALIDATION_SCHEMA_VERSION,
  type FieldValidationFileConstraints,
  type FieldValidationJson,
  type FileFieldValueContract,
} from '../field-validation';

/**
 * File upload field runtime value contract.
 * Gateway proxies upload; core stores the storage ref on submit.
 *
 * @example
 * { "key": "tenants/1/uploads/abc.pdf", "filename": "report.pdf", "mimeType": "application/pdf", "sizeBytes": 1024 }
 */
export const FILE_FIELD_VALUE_CONTRACT_DESCRIPTION =
  'File field values are objects with required `key` (storage ref) and optional `filename`, `mimeType`, `sizeBytes`.';
