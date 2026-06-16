/**
 * Maps resolved config-object field maps onto legacy flat template variables.
 */
export function applyFieldMapToLegacyVariables(
  variables: Record<string, unknown>,
  fields: Record<string, unknown>,
  legacyFieldMap: Record<string, string>,
): void {
  for (const [legacyKey, fieldKey] of Object.entries(legacyFieldMap)) {
    if (
      variables[legacyKey] === undefined ||
      variables[legacyKey] === null ||
      variables[legacyKey] === ''
    ) {
      const value = fields[fieldKey];
      if (value !== undefined && value !== null && value !== '') {
        variables[legacyKey] = value;
      }
    }
  }
}
