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
  MEDIA_PATH_MAX_LENGTH,
  type FieldValidationFileConstraints,
  type FieldValidationJson,
  type FileFieldValueContract,
  type MediaFieldValue,
  type MediaRef,
} from '../field-validation';

/**
 * File upload field runtime value contract.
 * Gateway proxies upload; core stores the storage ref on submit.
 *
 * @example
 * { "path": "tenant/42/invoice/attachments/abc.pdf", "filename": "report.pdf", "contentType": "application/pdf", "sizeBytes": 1024 }
 */
export const FILE_FIELD_VALUE_CONTRACT_DESCRIPTION =
  'File field values are objects with required `path` (storage ref; legacy `key` accepted) and optional `filename`, `contentType`/`mimeType`, `sizeBytes`. Multi fields use an array of the same shape.';
