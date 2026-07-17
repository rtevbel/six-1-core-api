export const FIELD_VALIDATION_SCHEMA_VERSION = 1 as const;

/** Max length for a stored media path string. */
export const MEDIA_PATH_MAX_LENGTH = 512;

/**
 * File upload field value shape (storage ref).
 * Gateway proxies upload; Core persists only this ref on records.
 *
 * Prefer `path`. Legacy `key` is accepted during migration and normalized to `path`.
 */
export interface FileFieldValueContract {
  path: string;
  /** @deprecated Use `path`. Accepted during migration. */
  key?: string;
  filename?: string;
  contentType?: string;
  /** @deprecated Use `contentType`. Accepted during migration. */
  mimeType?: string;
  sizeBytes?: number;
}

/** Alias for the canonical media reference stored on records. */
export type MediaRef = FileFieldValueContract;

export type MediaFieldValue = MediaRef | MediaRef[];

export interface FieldValidationFileConstraints {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

/**
 * Standard validation constraints stored in `config_object_fields.validation_json`.
 * Top-level `accept` / `maxSizeBytes` / `maxFiles` align with Object Designer / Frontend.
 * Nested `file` remains supported for backward compatibility.
 */
export interface FieldValidationJson {
  schemaVersion?: typeof FIELD_VALIDATION_SCHEMA_VERSION;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  /** HTML accept list (e.g. `.pdf,image/*`). */
  accept?: string;
  /** Max file size in bytes (single file). */
  maxSizeBytes?: number;
  /** Max files when the field is multi-valued. Default 1. */
  maxFiles?: number;
  /** Legacy nested file constraints (dual-read). */
  file?: FieldValidationFileConstraints;
}
