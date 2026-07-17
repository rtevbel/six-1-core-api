import {
  isValidFileFieldValue,
  normalizeMediaRef,
  type MediaRef,
} from '../config_objects/field-validation';

/**
 * Collect all media path strings from a nested payload (MediaRef or arrays thereof).
 */
export function collectMediaPathsFromValue(value: unknown): string[] {
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (node == null) {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }
    if (typeof node !== 'object') {
      return;
    }
    if (isValidFileFieldValue(node)) {
      const ref = normalizeMediaRef(node);
      if (ref?.path) {
        out.push(ref.path);
      }
      return;
    }
    for (const child of Object.values(node as Record<string, unknown>)) {
      visit(child);
    }
  };
  visit(value);
  return out;
}

/**
 * Normalize attachment-typed fields in a payload using field registry descriptors.
 * Non-attachment keys are left unchanged.
 */
export function normalizeAttachmentFieldsInPayload(
  payload: Record<string, unknown>,
  fieldRegistry: Array<{
    fieldKey: string;
    fieldType?: string;
    mediaConstraints?: { maxFiles?: number };
  }>,
  normalizeAttachment: (
    value: unknown,
    maxFiles?: number,
  ) =>
    | { ok: true; value: MediaRef | MediaRef[] }
    | { ok: false; message: string },
): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string; fieldKey: string } {
  const byKey = new Map(fieldRegistry.map((f) => [f.fieldKey, f]));
  const next: Record<string, unknown> = { ...payload };

  for (const [fieldKey, value] of Object.entries(payload)) {
    const descriptor = byKey.get(fieldKey);
    if (
      !descriptor ||
      typeof descriptor.fieldType !== 'string' ||
      descriptor.fieldType.trim().toLowerCase() !== 'attachment'
    ) {
      continue;
    }
    const normalized = normalizeAttachment(
      value,
      descriptor.mediaConstraints?.maxFiles,
    );
    if (!normalized.ok) {
      return { ok: false, message: normalized.message, fieldKey };
    }
    next[fieldKey] = normalized.value;
  }

  return { ok: true, payload: next };
}
