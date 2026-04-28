import {
  PanelLayoutConfigValidationError,
  validateAndNormalizePanelLayoutConfigJson,
} from './panel-layout.validator';

describe('validateAndNormalizePanelLayoutConfigJson', () => {
  it('returns null for null or undefined', () => {
    expect(validateAndNormalizePanelLayoutConfigJson(null)).toBeNull();
    expect(validateAndNormalizePanelLayoutConfigJson(undefined)).toBeNull();
  });

  it('accepts minimal table layout', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'table',
      layout: { columns: ['name', 'status'] },
    });
    expect(out?.displayMode).toBe('table');
    expect(out?.layout).toEqual({ columns: ['name', 'status'] });
  });

  it('rejects unknown top-level keys', () => {
    expect(() =>
      validateAndNormalizePanelLayoutConfigJson({
        schemaVersion: 1,
        displayMode: 'table',
        layout: { columns: ['a'] },
        extra: 1,
      }),
    ).toThrow(PanelLayoutConfigValidationError);
    expect(() =>
      validateAndNormalizePanelLayoutConfigJson({
        schemaVersion: 1,
        displayMode: 'table',
        layout: { columns: ['a'] },
        extra: 1,
      }),
    ).toThrow(/Unknown top-level key/);
  });

  it('rejects table without columns', () => {
    expect(() =>
      validateAndNormalizePanelLayoutConfigJson({
        schemaVersion: 1,
        displayMode: 'table',
        layout: {},
      }),
    ).toThrow(/layout.columns/);
  });

  it('rejects unknown layout keys for table', () => {
    expect(() =>
      validateAndNormalizePanelLayoutConfigJson({
        schemaVersion: 1,
        displayMode: 'table',
        layout: { columns: ['a'], bogus: true },
      }),
    ).toThrow(/unknown keys for table/);
  });

  it('accepts cards with cardFields', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'cards',
      layout: { cardFields: ['title', 'subtitle'] },
    });
    expect(out?.layout).toEqual({ cardFields: ['title', 'subtitle'] });
  });

  it('accepts summary with keyValueFields', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'summary',
      layout: { keyValueFields: ['name', 'status'] },
    });
    expect(out?.layout).toEqual({ keyValueFields: ['name', 'status'] });
  });

  it('accepts form-section with fieldOrder', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'form-section',
      layout: { fieldOrder: ['a', 'b'] },
    });
    expect(out?.layout).toEqual({ fieldOrder: ['a', 'b'] });
  });

  it('accepts timeline with timeField', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'timeline',
      layout: { timeField: 'createdAt', eventFields: ['type', 'body'] },
    });
    expect(out?.layout).toEqual({
      timeField: 'createdAt',
      eventFields: ['type', 'body'],
    });
  });

  it('accepts custom-slot with slotKey', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'custom-slot',
      layout: { slotKey: 'my.slot' },
    });
    expect(out?.layout).toEqual({ slotKey: 'my.slot' });
  });

  it('passes through optional actions and style', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'table',
      dataBinding: 'main',
      layout: { columns: ['x'] },
      actions: { row: ['edit'] },
      style: { density: 'compact' },
    });
    expect(out?.actions).toEqual({ row: ['edit'] });
    expect(out?.style).toEqual({ density: 'compact' });
    expect(out?.dataBinding).toBe('main');
  });

  it('accepts table membership metadata keys in layout', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'table',
      layout: {
        columns: ['name'],
        relationKey: 'project_roles',
        targetEntityKey: 'roles',
        selectionControl: 'checkbox',
      },
    });
    expect(out?.layout).toEqual({
      columns: ['name'],
      relationKey: 'project_roles',
      targetEntityKey: 'roles',
      selectionControl: 'checkbox',
    });
  });
});
