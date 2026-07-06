import {
  assertReferenceListDataRefKnown,
  buildReferenceListCatalog,
  buildSchemaLookupCatalog,
  resolveReferenceListToken,
  ReferenceListValidationError,
} from './reference-list.registry';

describe('reference-list.registry', () => {
  it('resolves core.system_statuses.list', () => {
    const entry = resolveReferenceListToken('core.system_statuses.list');
    expect(entry?.kind).toBe('core');
    expect(entry?.objectType).toBe('system_status');
    expect(entry?.listPattern).toBe('manifest.api.list');
  });

  it('aliases core.languages.list to core.system_languages.list', () => {
    const entry = resolveReferenceListToken('core.languages.list');
    expect(entry?.token).toBe('core.system_languages.list');
  });

  it('resolves entity-key:customer dynamically', () => {
    const entry = resolveReferenceListToken('entity-key:customer');
    expect(entry?.kind).toBe('entity_key');
    expect(entry?.objectType).toBe('customer');
  });

  it('rejects unknown core.* tokens in strict mode', () => {
    expect(() =>
      assertReferenceListDataRefKnown('core.unknown.list', { strict: true }),
    ).toThrow(ReferenceListValidationError);
  });

  it('allows unknown tokens in non-strict mode', () => {
    expect(
      assertReferenceListDataRefKnown('core.unknown.list', { strict: false }),
    ).toBeNull();
  });

  it('buildReferenceListCatalog includes core seeds and entity-key rows', () => {
    const catalog = buildReferenceListCatalog();
    expect(catalog.catalogVersion).toBe(1);
    expect(catalog.entries.some((e) => e.token === 'core.roles.list')).toBe(true);
    expect(
      catalog.entries.some((e) => e.token === 'entity-key:tenant_user'),
    ).toBe(true);
    expect(
      catalog.entries.some((e) => e.token === 'entity-key:role_permissions'),
    ).toBe(false);
  });

  it('buildSchemaLookupCatalog deduplicates field dataRefs', () => {
    const slice = buildSchemaLookupCatalog({
      dataRefs: [
        'core.system_statuses.list',
        ' core.system_statuses.list ',
        'entity-key:customer',
      ],
    });
    expect(slice).toHaveLength(2);
  });
});
