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

  it('accepts cards with fieldLabelByKey map', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'cards',
      layout: {
        cardFields: ['name', 'description'],
        fieldLabelByKey: {
          name: 'Name',
          description: 'Description',
        },
      },
    });
    expect(out?.layout).toEqual({
      cardFields: ['name', 'description'],
      fieldLabelByKey: {
        name: 'Name',
        description: 'Description',
      },
    });
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

  it('accepts form-section with relation metadata in layout', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'form-section',
      layout: {
        fieldOrder: ['billingEmail', 'billingPhone'],
        relationKey: 'tenant_billing_info',
        targetEntityKey: 'tenant_billing_info',
      },
    });
    expect(out?.layout).toEqual({
      fieldOrder: ['billingEmail', 'billingPhone'],
      relationKey: 'tenant_billing_info',
      targetEntityKey: 'tenant_billing_info',
    });
  });

  it('accepts form-section with layout.dataBinding for relation-bound forms', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'form-section',
      layout: {
        sections: [
          {
            fields: ['billingEmail', 'billingPhone'],
            fieldConfigByKey: {
              billingEmail: { inputType: 'email', label: 'Email', required: true },
            },
          },
        ],
        relationKey: 'tenant_billing_info',
        targetEntityKey: 'tenant_billing_info',
        dataBinding: 'relation',
      },
    });
    expect(out?.layout).toEqual({
      sections: [
        {
          fields: ['billingEmail', 'billingPhone'],
          fieldConfigByKey: {
            billingEmail: { inputType: 'email', label: 'Email', required: true },
          },
        },
      ],
      relationKey: 'tenant_billing_info',
      targetEntityKey: 'tenant_billing_info',
      dataBinding: 'relation',
    });
    expect(out?.dataBinding).toBeUndefined();
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

  it('treats top-level actions: [] as omitted (optional)', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'cards',
      dataBinding: 'main',
      layout: {
        cardFields: ['name', 'groupName', 'languageId', 'statusId', 'description'],
      },
      actions: [],
    });
    expect(out?.actions).toBeUndefined();
    expect(out?.layout).toEqual({
      cardFields: ['name', 'groupName', 'languageId', 'statusId', 'description'],
    });
    expect(out?.dataBinding).toBe('main');
  });

  it('rejects non-empty actions array', () => {
    expect(() =>
      validateAndNormalizePanelLayoutConfigJson({
        schemaVersion: 1,
        displayMode: 'table',
        layout: { columns: ['x'] },
        actions: ['edit'],
      }),
    ).toThrow(PanelLayoutConfigValidationError);
  });

  it('accepts table with fieldLabelByKey for column headers', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'table',
      dataBinding: 'main',
      layout: {
        fieldLabelByKey: {
          name: 'Name',
          groupName: 'Group',
          description: 'Description',
          languageId: 'Language',
        },
        columns: ['name', 'groupName', 'description', 'languageId'],
      },
    });
    expect(out?.layout).toEqual({
      columns: ['name', 'groupName', 'description', 'languageId'],
      fieldLabelByKey: {
        name: 'Name',
        groupName: 'Group',
        description: 'Description',
        languageId: 'Language',
      },
    });
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

  it('accepts table layout with relation form/list authoring blocks', () => {
    const out = validateAndNormalizePanelLayoutConfigJson({
      schemaVersion: 1,
      displayMode: 'table',
      dataBinding: 'relation',
      layout: {
        columns: ['billingEmail', 'billingPhone'],
        dataBinding: 'relation',
        relationKey: 'tenant_billing_info',
        targetEntityKey: 'tenant_billing_info',
        relationPanelMode: 'related_list',
        form: {
          sections: [
            {
              fields: ['billingEmail'],
              title: 'Billing Info',
              fieldConfigByKey: {
                billingEmail: { inputType: 'email', label: 'Email', required: true },
              },
            },
          ],
        },
        list: {
          filters: [
            {
              source: 'core',
              field: 'billingCurrency',
              operator: 'in',
              value: ['USD'],
            },
          ],
          defaultSort: {
            field: 'billingEmail',
            sortBy: 'billingEmail',
            direction: 'asc',
          },
        },
        fieldLabelByKey: { billingEmail: 'Email' },
      },
      actions: [],
      pagination: { limit: 10 },
    });
    expect(out?.dataBinding).toBe('relation');
    expect(out?.layout).toMatchObject({
      columns: ['billingEmail', 'billingPhone'],
      dataBinding: 'relation',
      relationKey: 'tenant_billing_info',
      targetEntityKey: 'tenant_billing_info',
      relationPanelMode: 'related_list',
      fieldLabelByKey: { billingEmail: 'Email' },
    });
    expect(out?.layout.form).toBeDefined();
    expect(out?.layout.list).toBeDefined();
    expect(out?.pagination).toEqual({ limit: 10 });
  });

  it('rejects invalid layout.relationPanelMode for table', () => {
    expect(() =>
      validateAndNormalizePanelLayoutConfigJson({
        schemaVersion: 1,
        displayMode: 'table',
        layout: {
          columns: ['a'],
          relationPanelMode: 'bogus',
        },
      }),
    ).toThrow(/layout.relationPanelMode/);
  });
});
