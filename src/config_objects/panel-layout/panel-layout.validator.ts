import {
  PANEL_LAYOUT_CONFIG_SCHEMA_VERSION,
  PANEL_LAYOUT_CONFIG_TOP_LEVEL_KEYS,
  PANEL_LAYOUT_DATA_BINDING_VALUES,
  PANEL_LAYOUT_DISPLAY_MODES,
  PANEL_LAYOUT_RELATION_PANEL_MODES,
} from './panel-layout.constants';
import type {
  PanelLayoutConfig,
  PanelLayoutDisplayMode,
} from './panel-layout.types';

/**
 * Thrown when panel `layout_config` fails schema validation (authoring save).
 */
export class PanelLayoutConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PanelLayoutConfigValidationError';
  }
}

function assertPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new PanelLayoutConfigValidationError(`${label} must be a plain object`);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new PanelLayoutConfigValidationError(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertStringArray(
  value: unknown,
  field: string,
  options: { required: boolean; nonEmpty?: boolean },
): string[] | undefined {
  const { required, nonEmpty } = options;
  if (value === undefined || value === null) {
    if (required) {
      throw new PanelLayoutConfigValidationError(`${field} is required`);
    }
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new PanelLayoutConfigValidationError(`${field} must be an array of strings`);
  }
  for (const [i, el] of value.entries()) {
    if (typeof el !== 'string' || !el.trim()) {
      throw new PanelLayoutConfigValidationError(
        `${field}[${i}] must be a non-empty string`,
      );
    }
  }
  const arr = value as string[];
  if (nonEmpty && !arr.length) {
    throw new PanelLayoutConfigValidationError(`${field} must be a non-empty array`);
  }
  return arr;
}

function assertOptionalPlainObject(
  value: unknown,
  field: string,
): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new PanelLayoutConfigValidationError(`${field} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

/**
 * Optional object field where clients may send `[]` meaning "no config" (omit from output).
 */
function assertOptionalPlainObjectOrAbsentEmptyArray(
  value: unknown,
  field: string,
): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }
    throw new PanelLayoutConfigValidationError(
      `${field} must be a plain object when provided (empty array omits actions)`,
    );
  }
  if (typeof value !== 'object') {
    throw new PanelLayoutConfigValidationError(`${field} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertOptionalPassthrough(
  value: unknown,
  field: string,
): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  throw new PanelLayoutConfigValidationError(
    `${field} must be a string or plain object`,
  );
}

function isDisplayMode(value: unknown): value is PanelLayoutDisplayMode {
  return (
    typeof value === 'string' &&
    (PANEL_LAYOUT_DISPLAY_MODES as readonly string[]).includes(value)
  );
}

function assertDataBindingValue(
  value: unknown,
  field: string,
): PanelLayoutConfig['dataBinding'] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    !(PANEL_LAYOUT_DATA_BINDING_VALUES as readonly string[]).includes(value)
  ) {
    throw new PanelLayoutConfigValidationError(
      `${field} must be one of: ${PANEL_LAYOUT_DATA_BINDING_VALUES.join(', ')}`,
    );
  }
  return value as PanelLayoutConfig['dataBinding'];
}

function assertRelationPanelModeValue(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    !(PANEL_LAYOUT_RELATION_PANEL_MODES as readonly string[]).includes(value)
  ) {
    throw new PanelLayoutConfigValidationError(
      `${field} must be one of: ${PANEL_LAYOUT_RELATION_PANEL_MODES.join(', ')}`,
    );
  }
  return value;
}

function normalizeFieldLabelByKeyMap(
  value: unknown,
): Record<string, string> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const labels = assertPlainObject(value, 'layout.fieldLabelByKey');
  const normalizedLabels: Record<string, string> = {};
  for (const [key, label] of Object.entries(labels)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      throw new PanelLayoutConfigValidationError(
        'layout.fieldLabelByKey keys must be non-empty strings',
      );
    }
    if (typeof label !== 'string' || !label.trim()) {
      throw new PanelLayoutConfigValidationError(
        `layout.fieldLabelByKey.${normalizedKey} must be a non-empty string`,
      );
    }
    normalizedLabels[normalizedKey] = label.trim();
  }
  return normalizedLabels;
}

function validateLayoutForMode(
  displayMode: PanelLayoutDisplayMode,
  layout: Record<string, unknown>,
): Record<string, unknown> {
  switch (displayMode) {
    case 'table': {
      const allowed = new Set([
        'columns',
        'rowActions',
        'bulkActions',
        'defaultSort',
        'relationKey',
        'targetEntityKey',
        'selectionControl',
        'fieldLabelByKey',
        'dataBinding',
        'relationPanelMode',
        'form',
        'list',
      ]);
      const unknownKeys = Object.keys(layout).filter((k) => !allowed.has(k));
      if (unknownKeys.length) {
        throw new PanelLayoutConfigValidationError(
          `layout: unknown keys for table: ${unknownKeys.join(', ')}`,
        );
      }
      const columns = assertStringArray(layout.columns, 'layout.columns', {
        required: true,
        nonEmpty: true,
      });
      const rowActions = assertStringArray(layout.rowActions, 'layout.rowActions', {
        required: false,
      });
      const bulkActions = assertStringArray(layout.bulkActions, 'layout.bulkActions', {
        required: false,
      });
      const out: Record<string, unknown> = { columns: columns! };
      if (rowActions?.length) {
        out.rowActions = rowActions;
      }
      if (bulkActions?.length) {
        out.bulkActions = bulkActions;
      }
      if (layout.defaultSort !== undefined && layout.defaultSort !== null) {
        const ds = assertPlainObject(layout.defaultSort, 'layout.defaultSort');
        const field = ds.field;
        const direction = ds.direction;
        if (typeof field !== 'string' || !field.trim()) {
          throw new PanelLayoutConfigValidationError(
            'layout.defaultSort.field is required',
          );
        }
        if (direction !== 'asc' && direction !== 'desc') {
          throw new PanelLayoutConfigValidationError(
            'layout.defaultSort.direction must be "asc" or "desc"',
          );
        }
        const extra = Object.keys(ds).filter((k) => !['field', 'direction'].includes(k));
        if (extra.length) {
          throw new PanelLayoutConfigValidationError(
            `layout.defaultSort: unknown keys: ${extra.join(', ')}`,
          );
        }
        out.defaultSort = { field: field.trim(), direction };
      }
      if (layout.relationKey !== undefined && layout.relationKey !== null) {
        if (
          typeof layout.relationKey !== 'string' ||
          !layout.relationKey.trim()
        ) {
          throw new PanelLayoutConfigValidationError(
            'layout.relationKey must be a non-empty string when set',
          );
        }
        out.relationKey = layout.relationKey.trim();
      }
      if (
        layout.targetEntityKey !== undefined &&
        layout.targetEntityKey !== null
      ) {
        if (
          typeof layout.targetEntityKey !== 'string' ||
          !layout.targetEntityKey.trim()
        ) {
          throw new PanelLayoutConfigValidationError(
            'layout.targetEntityKey must be a non-empty string when set',
          );
        }
        out.targetEntityKey = layout.targetEntityKey.trim();
      }
      if (
        layout.selectionControl !== undefined &&
        layout.selectionControl !== null
      ) {
        if (
          layout.selectionControl !== 'checkbox' &&
          layout.selectionControl !== 'radio'
        ) {
          throw new PanelLayoutConfigValidationError(
            'layout.selectionControl must be "checkbox" or "radio" when set',
          );
        }
        out.selectionControl = layout.selectionControl;
      }
      const fieldLabelByKey = normalizeFieldLabelByKeyMap(layout.fieldLabelByKey);
      if (fieldLabelByKey && Object.keys(fieldLabelByKey).length) {
        out.fieldLabelByKey = fieldLabelByKey;
      }
      const layoutDataBinding = assertDataBindingValue(
        layout.dataBinding,
        'layout.dataBinding',
      );
      if (layoutDataBinding) {
        out.dataBinding = layoutDataBinding;
      }
      const relationPanelMode = assertRelationPanelModeValue(
        layout.relationPanelMode,
        'layout.relationPanelMode',
      );
      if (relationPanelMode) {
        out.relationPanelMode = relationPanelMode;
      }
      const form = assertOptionalPlainObject(layout.form, 'layout.form');
      if (form) {
        out.form = form;
      }
      const list = assertOptionalPlainObject(layout.list, 'layout.list');
      if (list) {
        out.list = list;
      }
      return out;
    }
    case 'cards': {
      const allowed = new Set(['cardFields', 'groupBy', 'badges', 'fieldLabelByKey']);
      const unknownKeys = Object.keys(layout).filter((k) => !allowed.has(k));
      if (unknownKeys.length) {
        throw new PanelLayoutConfigValidationError(
          `layout: unknown keys for cards: ${unknownKeys.join(', ')}`,
        );
      }
      const cardFields = assertStringArray(layout.cardFields, 'layout.cardFields', {
        required: true,
        nonEmpty: true,
      });
      const out: Record<string, unknown> = { cardFields: cardFields! };
      if (layout.groupBy !== undefined && layout.groupBy !== null) {
        if (typeof layout.groupBy !== 'string' || !layout.groupBy.trim()) {
          throw new PanelLayoutConfigValidationError(
            'layout.groupBy must be a non-empty string when set',
          );
        }
        out.groupBy = layout.groupBy.trim();
      }
      if (layout.badges !== undefined && layout.badges !== null) {
        out.badges = assertPlainObject(layout.badges, 'layout.badges');
      }
      const fieldLabelByKey = normalizeFieldLabelByKeyMap(layout.fieldLabelByKey);
      if (fieldLabelByKey && Object.keys(fieldLabelByKey).length) {
        out.fieldLabelByKey = fieldLabelByKey;
      }
      return out;
    }
    case 'summary': {
      const allowed = new Set(['metrics', 'keyValueFields']);
      const unknownKeys = Object.keys(layout).filter((k) => !allowed.has(k));
      if (unknownKeys.length) {
        throw new PanelLayoutConfigValidationError(
          `layout: unknown keys for summary: ${unknownKeys.join(', ')}`,
        );
      }
      const keyValueFields = assertStringArray(
        layout.keyValueFields,
        'layout.keyValueFields',
        { required: false },
      );
      let metrics: unknown[] | undefined;
      if (layout.metrics !== undefined && layout.metrics !== null) {
        if (!Array.isArray(layout.metrics)) {
          throw new PanelLayoutConfigValidationError('layout.metrics must be an array');
        }
        if (!layout.metrics.length) {
          throw new PanelLayoutConfigValidationError(
            'layout.metrics must be a non-empty array when set',
          );
        }
        metrics = layout.metrics.map((item, i) =>
          assertPlainObject(item, `layout.metrics[${i}]`),
        );
      }
      const hasKvf = keyValueFields && keyValueFields.length > 0;
      const hasMet = metrics && metrics.length > 0;
      if (!hasKvf && !hasMet) {
        throw new PanelLayoutConfigValidationError(
          'layout for summary requires non-empty layout.metrics and/or layout.keyValueFields',
        );
      }
      const out: Record<string, unknown> = {};
      if (hasMet) {
        out.metrics = metrics;
      }
      if (hasKvf) {
        out.keyValueFields = keyValueFields;
      }
      return out;
    }
    case 'form-section': {
      const allowed = new Set([
        'sections',
        'fieldOrder',
        'relationKey',
        'targetEntityKey',
        'dataBinding',
      ]);
      const unknownKeys = Object.keys(layout).filter((k) => !allowed.has(k));
      if (unknownKeys.length) {
        throw new PanelLayoutConfigValidationError(
          `layout: unknown keys for form-section: ${unknownKeys.join(', ')}`,
        );
      }
      const fieldOrder = assertStringArray(layout.fieldOrder, 'layout.fieldOrder', {
        required: false,
        nonEmpty: true,
      });
      let sections: Record<string, unknown>[] | undefined;
      if (layout.sections !== undefined && layout.sections !== null) {
        if (!Array.isArray(layout.sections)) {
          throw new PanelLayoutConfigValidationError('layout.sections must be an array');
        }
        if (!layout.sections.length) {
          throw new PanelLayoutConfigValidationError(
            'layout.sections must be a non-empty array when set',
          );
        }
        sections = layout.sections.map((item, i) =>
          assertPlainObject(item, `layout.sections[${i}]`),
        );
      }
      const hasFo = fieldOrder && fieldOrder.length > 0;
      const hasSec = sections && sections.length > 0;
      if (!hasFo && !hasSec) {
        throw new PanelLayoutConfigValidationError(
          'layout for form-section requires non-empty layout.fieldOrder and/or layout.sections',
        );
      }
      const out: Record<string, unknown> = {};
      if (hasFo) {
        out.fieldOrder = fieldOrder;
      }
      if (hasSec) {
        out.sections = sections;
      }

      if (layout.relationKey !== undefined && layout.relationKey !== null) {
        if (typeof layout.relationKey !== 'string' || !layout.relationKey.trim()) {
          throw new PanelLayoutConfigValidationError(
            'layout.relationKey must be a non-empty string when set',
          );
        }
        out.relationKey = layout.relationKey.trim();
      }

      if (layout.targetEntityKey !== undefined && layout.targetEntityKey !== null) {
        if (
          typeof layout.targetEntityKey !== 'string' ||
          !layout.targetEntityKey.trim()
        ) {
          throw new PanelLayoutConfigValidationError(
            'layout.targetEntityKey must be a non-empty string when set',
          );
        }
        out.targetEntityKey = layout.targetEntityKey.trim();
      }

      const dataBinding = assertDataBindingValue(layout.dataBinding, 'layout.dataBinding');
      if (dataBinding) {
        out.dataBinding = dataBinding;
      }

      return out;
    }
    case 'timeline': {
      const allowed = new Set(['timeField', 'eventFields']);
      const unknownKeys = Object.keys(layout).filter((k) => !allowed.has(k));
      if (unknownKeys.length) {
        throw new PanelLayoutConfigValidationError(
          `layout: unknown keys for timeline: ${unknownKeys.join(', ')}`,
        );
      }
      if (typeof layout.timeField !== 'string' || !layout.timeField.trim()) {
        throw new PanelLayoutConfigValidationError(
          'layout.timeField is required for displayMode timeline',
        );
      }
      const out: Record<string, unknown> = {
        timeField: layout.timeField.trim(),
      };
      const eventFields = assertStringArray(
        layout.eventFields,
        'layout.eventFields',
        { required: false },
      );
      if (eventFields?.length) {
        out.eventFields = eventFields;
      }
      return out;
    }
    case 'custom-slot': {
      const allowed = new Set([
        'slotKey',
        'widgetRef',
        'inputBindings',
        'eventBindings',
      ]);
      const unknownKeys = Object.keys(layout).filter((k) => !allowed.has(k));
      if (unknownKeys.length) {
        throw new PanelLayoutConfigValidationError(
          `layout: unknown keys for custom-slot: ${unknownKeys.join(', ')}`,
        );
      }
      if (typeof layout.slotKey !== 'string' || !layout.slotKey.trim()) {
        throw new PanelLayoutConfigValidationError(
          'layout.slotKey is required for displayMode custom-slot',
        );
      }
      const out: Record<string, unknown> = { slotKey: layout.slotKey.trim() };
      if (layout.widgetRef !== undefined && layout.widgetRef !== null) {
        if (typeof layout.widgetRef !== 'string' || !layout.widgetRef.trim()) {
          throw new PanelLayoutConfigValidationError(
            'layout.widgetRef must be a non-empty string when set',
          );
        }
        out.widgetRef = layout.widgetRef.trim();
      }
      if (layout.inputBindings !== undefined && layout.inputBindings !== null) {
        out.inputBindings = assertPlainObject(
          layout.inputBindings,
          'layout.inputBindings',
        );
      }
      if (layout.eventBindings !== undefined && layout.eventBindings !== null) {
        out.eventBindings = assertPlainObject(
          layout.eventBindings,
          'layout.eventBindings',
        );
      }
      return out;
    }
    default: {
      throw new PanelLayoutConfigValidationError(
        `Unsupported displayMode: ${String(displayMode)}`,
      );
    }
  }
}

/**
 * Validates and normalizes panel `layout_config` for v1.
 * Returns `null` when input is `null` or `undefined` (caller persists SQL NULL).
 */
export function validateAndNormalizePanelLayoutConfigJson(
  value: unknown | null | undefined,
): PanelLayoutConfig | null {
  if (value === null || value === undefined) {
    return null;
  }

  const obj = assertPlainObject(value, 'layout_config');

  const allowedTop = PANEL_LAYOUT_CONFIG_TOP_LEVEL_KEYS as readonly string[];
  for (const key of Object.keys(obj)) {
    if (!allowedTop.includes(key)) {
      throw new PanelLayoutConfigValidationError(
        `Unknown top-level key "${key}". Allowed: ${PANEL_LAYOUT_CONFIG_TOP_LEVEL_KEYS.join(', ')}`,
      );
    }
  }

  const rawVersion = obj.schemaVersion;
  if (rawVersion === undefined || rawVersion === null) {
    throw new PanelLayoutConfigValidationError('schemaVersion is required');
  }
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion)) {
    throw new PanelLayoutConfigValidationError('schemaVersion must be an integer');
  }
  if (rawVersion !== PANEL_LAYOUT_CONFIG_SCHEMA_VERSION) {
    throw new PanelLayoutConfigValidationError(
      `Unsupported schemaVersion ${rawVersion}; expected ${PANEL_LAYOUT_CONFIG_SCHEMA_VERSION}`,
    );
  }

  const displayModeRaw = obj.displayMode;
  if (displayModeRaw === undefined || displayModeRaw === null) {
    throw new PanelLayoutConfigValidationError('displayMode is required');
  }
  if (!isDisplayMode(displayModeRaw)) {
    throw new PanelLayoutConfigValidationError(
      `displayMode must be one of: ${PANEL_LAYOUT_DISPLAY_MODES.join(', ')}`,
    );
  }
  const displayMode = displayModeRaw;

  const dataBinding = assertDataBindingValue(obj.dataBinding, 'dataBinding');

  const layoutRaw = obj.layout;
  if (layoutRaw === undefined || layoutRaw === null) {
    throw new PanelLayoutConfigValidationError('layout is required');
  }
  const layoutIn = assertPlainObject(layoutRaw, 'layout');
  const layout = validateLayoutForMode(displayMode, layoutIn);

  const actions = assertOptionalPlainObjectOrAbsentEmptyArray(obj.actions, 'actions');
  const style = assertOptionalPlainObject(obj.style, 'style');
  const permissions = assertOptionalPlainObject(obj.permissions, 'permissions');
  const pagination = assertOptionalPlainObject(obj.pagination, 'pagination');
  const sort = assertOptionalPlainObject(obj.sort, 'sort');
  const emptyState = assertOptionalPassthrough(obj.emptyState, 'emptyState');

  const out: PanelLayoutConfig = {
    schemaVersion: PANEL_LAYOUT_CONFIG_SCHEMA_VERSION,
    displayMode,
    layout,
  };

  if (dataBinding) {
    out.dataBinding = dataBinding;
  }
  if (actions) {
    out.actions = actions;
  }
  if (style) {
    out.style = style;
  }
  if (permissions) {
    out.permissions = permissions;
  }
  if (pagination) {
    out.pagination = pagination;
  }
  if (sort) {
    out.sort = sort;
  }
  if (emptyState !== undefined) {
    out.emptyState = emptyState;
  }

  return out;
}
