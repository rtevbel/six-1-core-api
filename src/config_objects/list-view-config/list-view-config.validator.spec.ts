import {
  ListViewConfigValidationError,
  validateAndNormalizeListViewConfigJson,
} from './list-view-config.validator';
import { LIST_VIEW_CONFIG_SCHEMA_VERSION } from './list-view-config.constants';

describe('validateAndNormalizeListViewConfigJson', () => {
  it('returns default for null, undefined, or empty object', () => {
    expect(validateAndNormalizeListViewConfigJson(null)).toEqual({
      schemaVersion: LIST_VIEW_CONFIG_SCHEMA_VERSION,
    });
    expect(validateAndNormalizeListViewConfigJson(undefined)).toEqual({
      schemaVersion: LIST_VIEW_CONFIG_SCHEMA_VERSION,
    });
    expect(validateAndNormalizeListViewConfigJson({})).toEqual({
      schemaVersion: LIST_VIEW_CONFIG_SCHEMA_VERSION,
    });
  });

  it('accepts full table + board shape', () => {
    const out = validateAndNormalizeListViewConfigJson({
      schemaVersion: 1,
      defaultPresentation: 'board',
      table: {
        columns: ['name', 'status'],
        defaultSort: { field: 'name', direction: 'asc' },
        rowActions: ['open'],
      },
      board: {
        groupByField: 'status',
        cardTitleField: 'name',
        cardSubtitleFields: ['owner'],
        swimlaneOrder: ['a', 'b'],
      },
    });
    expect(out.defaultPresentation).toBe('board');
    expect(out.table?.columns).toEqual(['name', 'status']);
    expect(out.board?.groupByField).toBe('status');
  });

  it('rejects unknown top-level keys', () => {
    expect(() =>
      validateAndNormalizeListViewConfigJson({
        schemaVersion: 1,
        extraKey: 1,
      } as Record<string, unknown>),
    ).toThrow(ListViewConfigValidationError);
  });

  it('rejects unsupported schemaVersion', () => {
    expect(() =>
      validateAndNormalizeListViewConfigJson({ schemaVersion: 99 }),
    ).toThrow(ListViewConfigValidationError);
  });

  it('rejects bad defaultPresentation', () => {
    expect(() =>
      validateAndNormalizeListViewConfigJson({
        schemaVersion: 1,
        defaultPresentation: 'timeline',
      }),
    ).toThrow(ListViewConfigValidationError);
  });

  it('rejects unknown keys inside table', () => {
    expect(() =>
      validateAndNormalizeListViewConfigJson({
        schemaVersion: 1,
        table: { columns: ['x'], foo: 1 } as Record<string, unknown>,
      }),
    ).toThrow(ListViewConfigValidationError);
  });

  it('accepts table.column objects with field and label', () => {
    const out = validateAndNormalizeListViewConfigJson({
      schemaVersion: 1,
      table: {
        columns: [
          { field: 'name', label: 'Name · related' },
          { field: 'statusId' },
        ],
        defaultSort: { field: 'name', direction: 'asc' },
      },
    });
    expect(out.table?.columns).toEqual([
      { field: 'name', label: 'Name · related' },
      { field: 'statusId' },
    ]);
  });

  it('accepts pagination, filters, and actions under table', () => {
    const out = validateAndNormalizeListViewConfigJson({
      schemaVersion: 1,
      table: {
        columns: ['a'],
        pagination: { defaultLimit: 25, limitOptions: [10, 25, 50] },
        filters: [{ field: 'statusId', op: 'eq' }],
        actions: ['export'],
      },
    });
    expect(out.table?.pagination).toEqual({
      defaultLimit: 25,
      limitOptions: [10, 25, 50],
    });
    expect(out.table?.filters).toEqual([{ field: 'statusId', op: 'eq' }]);
    expect(out.table?.actions).toEqual(['export']);
  });

  it('accepts table.actions as bindingKey + label objects', () => {
    const out = validateAndNormalizeListViewConfigJson({
      schemaVersion: 1,
      table: {
        columns: ['name'],
        actions: [
          { label: 'Add category', bindingKey: 'create' },
          { bindingKey: 'detail' },
        ],
      },
    });
    expect(out.table?.actions).toEqual([
      { label: 'Add category', bindingKey: 'create' },
      { bindingKey: 'detail' },
    ]);
  });

  it('accepts table.actions path + method on action objects', () => {
    const out = validateAndNormalizeListViewConfigJson({
      schemaVersion: 1,
      table: {
        columns: ['name'],
        actions: [
          {
            label: 'Add customer',
            bindingKey: 'create',
            path: 'customers',
            method: 'POST',
          },
        ],
      },
    });
    expect(out.table?.actions).toEqual([
      {
        label: 'Add customer',
        bindingKey: 'create',
        path: 'customers',
        method: 'POST',
      },
    ]);
  });

  it('rejects unknown keys on table.actions[] objects', () => {
    expect(() =>
      validateAndNormalizeListViewConfigJson({
        schemaVersion: 1,
        table: {
          columns: ['a'],
          actions: [{ bindingKey: 'x', href: '/bad' } as Record<string, unknown>],
        },
      }),
    ).toThrow(ListViewConfigValidationError);
  });

  it('rejects invalid pagination values', () => {
    expect(() =>
      validateAndNormalizeListViewConfigJson({
        schemaVersion: 1,
        table: { columns: ['a'], pagination: { defaultLimit: 0 } },
      }),
    ).toThrow(ListViewConfigValidationError);
  });
});
