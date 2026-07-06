export const FIELD_VALIDATION_SCHEMA_VERSION = 1 as const;

/**
 * File upload field value shape (storage ref). Gateway proxies upload separately.
 */
export interface FileFieldValueContract {
  key: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface FieldValidationFileConstraints {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

/**
 * Standard validation constraints stored in `config_object_fields.validation_json`.
 * `_six1*` authoring keys are validated separately.
 */
export interface FieldValidationJson {
  schemaVersion?: typeof FIELD_VALIDATION_SCHEMA_VERSION;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  file?: FieldValidationFileConstraints;
}
