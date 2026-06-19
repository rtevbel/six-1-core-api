/** Non-field gate requirement types allowed when gate policy is enforced (Track C). */
export const ALLOWED_PROCESS_STEP_REQUIREMENT_TYPES = [
  'approval',
  'payment',
  'external_attestation',
] as const;

export type AllowedProcessStepRequirementType =
  (typeof ALLOWED_PROCESS_STEP_REQUIREMENT_TYPES)[number];

/** Legacy types that indicate field/data collection — prefer object bindings. */
export const LEGACY_FIELD_FORM_REQUIREMENT_TYPES = [
  'document',
  'form',
  'field',
  'fields',
  'data',
  'data_collection',
  'config_object',
  'standalone',
  'json_form',
  'survey',
] as const;

export const PROCESS_STEP_REQUIREMENT_POLICY_DOC_PATH =
  'docs/process-step-requirement-policy.md';

export const PROCESS_STEP_REQUIREMENT_TYPE_NOT_ALLOWED_MESSAGE =
  'requirementType must be one of approval, payment, external_attestation; use process_template_step_object_bindings for field forms (see docs/process-step-requirement-policy.md).';

export const PROCESS_STEP_REQUIREMENT_FIELD_FORM_OVERLAP_MESSAGE =
  'json_schema looks like a field form and overlaps an object binding on this step; move data collection to process_template_step_object_bindings (see docs/process-step-requirement-policy.md).';

/** Property keys commonly used on gate submissions, not business field payloads. */
export const REQUIREMENT_GATE_METADATA_PROPERTY_KEYS = new Set([
  'approved',
  'rejected',
  'decision',
  'status',
  'approver',
  'approvercomment',
  'approver_comment',
  'comment',
  'comments',
  'notes',
  'note',
  'reason',
  'attestationid',
  'attestation_id',
  'externalreference',
  'external_reference',
  'reference',
  'referenceid',
  'reference_id',
  'paymentid',
  'payment_id',
  'transactionid',
  'transaction_id',
  'receipturl',
  'receipt_url',
  'signedat',
  'signed_at',
  'signature',
]);
