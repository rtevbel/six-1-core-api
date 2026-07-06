import {
  normalizeQueryConfigInlineRelation,
  normalizeQueryConfigJoinTable,
  validateAndNormalizeRelationManifestsByKey,
  RelationAuthoringValidationError,
} from './relation-authoring.validator';

describe('normalizeQueryConfigInlineRelation', () => {
  it('passes through when inlineRelation absent', () => {
    const out = normalizeQueryConfigInlineRelation({ sor_table: 't' });
    expect(out).toEqual({ sor_table: 't' });
  });

  it('normalizes inlineRelation with path', () => {
    const out = normalizeQueryConfigInlineRelation({
      inlineRelation: { mode: 'inline_required', path: 'roleDescriptions' },
    });
    expect(out.inlineRelation).toEqual({
      mode: 'inline_required',
      path: 'roleDescriptions',
    });
  });

  it('rejects invalid mode', () => {
    expect(() =>
      normalizeQueryConfigInlineRelation({
        inlineRelation: { mode: 'invalid' },
      }),
    ).toThrow(RelationAuthoringValidationError);
  });
});

describe('validateAndNormalizeRelationManifestsByKey', () => {
  it('returns null for null', () => {
    expect(validateAndNormalizeRelationManifestsByKey(null)).toBeNull();
  });

  it('accepts dataRef tokens', () => {
    const out = validateAndNormalizeRelationManifestsByKey({
      permissions: { dataRef: 'six1:data:role.permissions' },
    });
    expect(out?.permissions?.dataRef).toBe('six1:data:role.permissions');
  });

  it('accepts rich relation_membership manifest blocks', () => {
    const out = validateAndNormalizeRelationManifestsByKey({
      role_permissions: {
        mode: 'relation_membership',
        targetEntityKey: 'permissions',
        displayMode: 'table',
        columns: ['code', 'name', 'isAssigned'],
        actions: {
          assignRef: 'six1:action:role.permissions.assign',
          unassignRef: 'six1:action:role.permissions.unassign',
          listRef: 'six1:action:role.permissions.list',
        },
        queryDefaults: {
          pageSize: 25,
        },
      },
    });

    expect(out?.role_permissions?.mode).toBe('relation_membership');
    expect(out?.role_permissions?.selectionControl).toBe('checkbox');
    expect(out?.role_permissions?.columns).toEqual(['code', 'name', 'isAssigned']);
  });

  it('accepts embedded_form manifest blocks', () => {
    const out = validateAndNormalizeRelationManifestsByKey({
      tenant_billing_info: {
        mode: 'embedded_form',
        targetEntityKey: 'tenant_billing_info',
        displayMode: 'form-section',
        actions: {
          loadRef: 'api.get',
          upsertRef: 'api.upsert',
        },
      },
    });

    expect(out?.tenant_billing_info?.mode).toBe('embedded_form');
    expect(out?.tenant_billing_info?.displayMode).toBe('form-section');
    expect(out?.tenant_billing_info?.actions).toEqual({
      loadRef: 'api.get',
      upsertRef: 'api.upsert',
    });
  });

  it('rejects embedded_form when required keys are missing', () => {
    expect(() =>
      validateAndNormalizeRelationManifestsByKey({
        tenant_billing_info: {
          mode: 'embedded_form',
          targetEntityKey: 'tenant_billing_info',
          displayMode: 'form-section',
          actions: {
            loadRef: 'api.get',
          },
        },
      }),
    ).toThrow(/must include upsertRef or both createRef and updateRef/);
  });

  it('rejects relation_membership when required keys are missing', () => {
    expect(() =>
      validateAndNormalizeRelationManifestsByKey({
        role_permissions: {
          mode: 'relation_membership',
          displayMode: 'table',
        },
      }),
    ).toThrow(/targetEntityKey is required/);
  });

  it('rejects relation_membership when listRef is missing', () => {
    expect(() =>
      validateAndNormalizeRelationManifestsByKey({
        role_permissions: {
          mode: 'relation_membership',
          targetEntityKey: 'permission',
          displayMode: 'table',
          columns: ['code'],
          actions: {
            assignRef: 'six1:action:role.permissions.assign',
            unassignRef: 'six1:action:role.permissions.unassign',
          },
        },
      }),
    ).toThrow(/listRef/);
  });
});

describe('normalizeQueryConfigJoinTable', () => {
  it('validates join_table metadata', () => {
    const out = normalizeQueryConfigJoinTable({
      join_table: 'role_permissions',
      join_local_key: 'role_id',
      join_foreign_key: 'permission_id',
      target_table: 'permissions',
    });
    expect(out.join_table).toBe('role_permissions');
  });
});
