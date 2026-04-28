/**
 * Optional write-schema hints keyed by `fieldKey`.
 * Used to override inferred defaults from {@link mergeWriteSchemaCapabilities}.
 *
 * When a property is omitted on a descriptor after merge, callers treat it as
 * inherited from authoring / upstream DTO rules (see A-4 integration).
 */
export interface FieldWriteCapability {
  canCreate?: boolean;
  canUpdate?: boolean;
  requiredOnCreate?: boolean;
  requiredOnUpdate?: boolean;
}
