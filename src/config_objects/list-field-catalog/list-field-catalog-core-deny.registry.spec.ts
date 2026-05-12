import { deniedCoreFieldKeysForObjectListCatalog } from './list-field-catalog-core-deny.registry';

describe('list-field-catalog-core-deny.registry', () => {
  it('denies password for customer catalog', () => {
    const denied = deniedCoreFieldKeysForObjectListCatalog('customer');
    expect(denied.has('password')).toBe(true);
    expect(denied.has('email')).toBe(false);
  });
});
