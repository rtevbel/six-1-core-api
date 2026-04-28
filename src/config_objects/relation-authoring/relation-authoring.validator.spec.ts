import {
  normalizeQueryConfigInlineRelation,
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

  it('rejects URLs in dataRef', () => {
    expect(() =>
      validateAndNormalizeRelationManifestsByKey({
        x: { dataRef: 'https://example.com/x' },
      }),
    ).toThrow(/not a URL/);
  });
});
