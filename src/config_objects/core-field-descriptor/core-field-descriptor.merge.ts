import type { ConfigObjectBindingMode } from '../entities/config_object.entity';
import type { ConfigObjectFieldRuleEntity } from '../entities/config_object_field_rule.entity';
import type { ConfigObjectFieldView } from '../interfaces/config-object-resolved-instance.interface';
import type { SorFieldPrimitiveType } from '../sor-field-descriptors.registry';
import {
  validateDerivedRuntimeAuthoringMetadata,
  validateLookupSelectAuthoringMetadata,
} from '../field-runtime-authoring';

import { CORE_FIELD_PRIMITIVE_TYPES } from './core-field-descriptor.constants';
import { generateBaseCoreFieldDescriptors } from './core-field-descriptor.generator';
import type { CoreFieldDescriptor } from './core-field-descriptor.types';
import { validateCoreFieldDescriptor } from './core-field-descriptor.validator';

/**
 * Maps designer `field_type` strings onto {@link SorFieldPrimitiveType}.
 * Unknown values fall back to `text` so authoring keeps working; operators should
 * prefer keys in {@link CORE_FIELD_PRIMITIVE_TYPES}.
 */
export function normalizeCustomFieldType(raw: string): SorFieldPrimitiveType {
  const trimmed = raw.trim().toLowerCase();
  if ((CORE_FIELD_PRIMITIVE_TYPES as readonly string[]).includes(trimmed)) {
    return trimmed as SorFieldPrimitiveType;
  }
  const aliases: Record<string, SorFieldPrimitiveType> = {
    string: 'text',
    varchar: 'text',
    int: 'number',
    integer: 'number',
    float: 'number',
    double: 'number',
    bool: 'boolean',
    datetime: 'date',
    timestamp: 'date',
    file: 'attachment',
    media: 'attachment',
  };
  return aliases[trimmed] ?? 'text';
}

function isGlobalDefaultRule(rule: ConfigObjectFieldRuleEntity): boolean {
  return (
    (rule.lifecycleStateKey == null || rule.lifecycleStateKey === '') &&
    (rule.roleKey == null || rule.roleKey === '')
  );
}

/**
 * Aggregates **global** field rules (no lifecycle / role scope) into UX hints.
 * Scoped rules are ignored here; runtime applies those per request (future).
 */
function applyGlobalRulesToDescriptor(
  descriptor: CoreFieldDescriptor,
  rules: ConfigObjectFieldRuleEntity[],
): CoreFieldDescriptor {
  const globals = rules.filter(isGlobalDefaultRule);
  if (!globals.length) {
    return descriptor;
  }
  let readOnly = descriptor.readOnly === true;
  for (const r of globals) {
    if (r.isReadonly) {
      readOnly = true;
    }
  }
  const next = { ...descriptor };
  if (readOnly) {
    next.readOnly = true;
  }
  return next;
}

function mergeBaseWithFieldView(
  base: CoreFieldDescriptor,
  fieldView: ConfigObjectFieldView,
): CoreFieldDescriptor {
  const f = fieldView.field;
  const ruleEntities = fieldView.rules.map((rv) => rv.fieldRule);
  const runtimeMetadata = extractRuntimeMetadataFromValidationJson(f.validationJson);

  const merged: CoreFieldDescriptor = {
    ...base,
    label: f.label?.trim() ? f.label : base.label,
    orderIndex: f.orderIndex,
    sectionKey: f.sectionKey ?? undefined,
    description: f.description ?? undefined,
    ...runtimeMetadata,
  };

  if (f.isRequired) {
    merged.requiredOnCreate = true;
    merged.requiredOnUpdate = true;
  }

  const withRules = applyGlobalRulesToDescriptor(merged, ruleEntities);
  return validateCoreFieldDescriptor(withRules);
}

function descriptorFromCustomFieldView(
  fieldView: ConfigObjectFieldView,
): CoreFieldDescriptor {
  const f = fieldView.field;
  const ruleEntities = fieldView.rules.map((rv) => rv.fieldRule);
  const runtimeMetadata = extractRuntimeMetadataFromValidationJson(f.validationJson);

  const draft: CoreFieldDescriptor = {
    fieldKey: f.fieldKey,
    label: f.label,
    fieldType: normalizeCustomFieldType(f.fieldType),
    orderIndex: f.orderIndex,
    sectionKey: f.sectionKey ?? undefined,
    description: f.description ?? undefined,
    ...runtimeMetadata,
  };

  if (f.isRequired) {
    draft.requiredOnCreate = true;
    draft.requiredOnUpdate = true;
  }

  const withRules = applyGlobalRulesToDescriptor(draft, ruleEntities);
  return validateCoreFieldDescriptor(withRules);
}

function extractRuntimeMetadataFromValidationJson(
  validationJson: Record<string, unknown> | null,
): Pick<
  CoreFieldDescriptor,
  'lookupSelectConfig' | 'derivedRuntimeConfig' | 'mediaConstraints'
> {
  if (!validationJson) {
    return {};
  }
  const out: Pick<
    CoreFieldDescriptor,
    'lookupSelectConfig' | 'derivedRuntimeConfig' | 'mediaConstraints'
  > = {};
  try {
    if (
      Object.prototype.hasOwnProperty.call(validationJson, '_six1LookupSelectAuthoring')
    ) {
      out.lookupSelectConfig = validateLookupSelectAuthoringMetadata(
        validationJson._six1LookupSelectAuthoring,
      );
    }
  } catch {
    // Intentionally ignore invalid legacy metadata during read.
  }
  try {
    if (
      Object.prototype.hasOwnProperty.call(
        validationJson,
        '_six1DerivedRuntimeAuthoring',
      )
    ) {
      out.derivedRuntimeConfig = validateDerivedRuntimeAuthoringMetadata(
        validationJson._six1DerivedRuntimeAuthoring,
      );
    }
  } catch {
    // Intentionally ignore invalid legacy metadata during read.
  }

  const mediaConstraints = extractMediaConstraintsFromValidationJson(validationJson);
  if (mediaConstraints) {
    out.mediaConstraints = mediaConstraints;
  }
  return out;
}

function extractMediaConstraintsFromValidationJson(
  validationJson: Record<string, unknown>,
): CoreFieldDescriptor['mediaConstraints'] | undefined {
  const nested =
    validationJson.file &&
    typeof validationJson.file === 'object' &&
    !Array.isArray(validationJson.file)
      ? (validationJson.file as Record<string, unknown>)
      : null;

  const accept =
    typeof validationJson.accept === 'string' && validationJson.accept.trim()
      ? validationJson.accept.trim()
      : undefined;

  let maxSizeBytes: number | undefined;
  if (
    typeof validationJson.maxSizeBytes === 'number' &&
    Number.isInteger(validationJson.maxSizeBytes) &&
    validationJson.maxSizeBytes > 0
  ) {
    maxSizeBytes = validationJson.maxSizeBytes;
  } else if (
    nested &&
    typeof nested.maxSizeBytes === 'number' &&
    Number.isInteger(nested.maxSizeBytes) &&
    nested.maxSizeBytes > 0
  ) {
    maxSizeBytes = nested.maxSizeBytes;
  }

  let maxFiles: number | undefined;
  if (
    typeof validationJson.maxFiles === 'number' &&
    Number.isInteger(validationJson.maxFiles) &&
    validationJson.maxFiles > 0
  ) {
    maxFiles = validationJson.maxFiles;
  }

  if (!accept && maxSizeBytes == null && maxFiles == null) {
    return undefined;
  }
  return {
    ...(accept ? { accept } : {}),
    ...(maxSizeBytes != null ? { maxSizeBytes } : {}),
    ...(maxFiles != null ? { maxFiles } : {}),
  };
}

function sortFieldViewsForAppend(
  views: ConfigObjectFieldView[],
): ConfigObjectFieldView[] {
  return [...views].sort((a, b) => {
    const sa = a.field.sectionKey ?? '';
    const sb = b.field.sectionKey ?? '';
    if (sa !== sb) {
      return sa.localeCompare(sb);
    }
    return a.field.orderIndex - b.field.orderIndex;
  });
}

/**
 * Merges code-first **base** descriptors with `config_object_fields` (+ global rules).
 *
 * - **SoR keys** also present as DB rows: designer wins label, order, section,
 *   description; SoR `fieldType` is kept to stay aligned with entity columns.
 * - **Custom-only keys**: appended after all base keys, sorted by `section_key`
 *   then `order_index` (same ordering policy as {@link buildMergedFieldOrder}).
 */
export function mergeCoreFieldDescriptorsWithFieldViews(
  base: CoreFieldDescriptor[],
  fieldViews: ConfigObjectFieldView[],
): CoreFieldDescriptor[] {
  const baseKeys = new Set(base.map((d) => d.fieldKey));
  const fieldByKey = new Map(
    fieldViews.map((fv) => [fv.field.fieldKey, fv] as const),
  );

  const mergedBase: CoreFieldDescriptor[] = [];
  for (const row of base) {
    const fv = fieldByKey.get(row.fieldKey);
    if (fv) {
      mergedBase.push(mergeBaseWithFieldView(row, fv));
    } else {
      mergedBase.push(row);
    }
  }

  const customOnly = fieldViews.filter((fv) => !baseKeys.has(fv.field.fieldKey));
  const sortedCustom = sortFieldViewsForAppend(customOnly).map(
    descriptorFromCustomFieldView,
  );

  return [...mergedBase, ...sortedCustom];
}

/**
 * Convenience: base layer from binding mode + object type, then merge designer fields.
 */
export function buildMergedCoreFieldDescriptors(params: {
  bindingMode: ConfigObjectBindingMode;
  objectType: string;
  fieldViews: ConfigObjectFieldView[];
}): CoreFieldDescriptor[] {
  const base = generateBaseCoreFieldDescriptors({
    bindingMode: params.bindingMode,
    objectType: params.objectType,
  });
  return mergeCoreFieldDescriptorsWithFieldViews(base, params.fieldViews);
}
