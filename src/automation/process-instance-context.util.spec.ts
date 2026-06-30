import {
  buildProcessContextResolutionRoot,
  contextStorageKeyForObjectType,
  mergeBindingCoreIdsIntoProcessContext,
  normalizeProcessContextStoragePath,
  resolveChildContextFromParentPatch,
} from './process-instance-context.util';

describe('process-instance-context.util', () => {
  it('maps object types to conventional context keys', () => {
    expect(contextStorageKeyForObjectType('customer')).toBe('customerId');
    expect(contextStorageKeyForObjectType('resource')).toBe('resourceId');
  });

  it('strips context. prefix for stored JSON paths', () => {
    expect(normalizeProcessContextStoragePath('context.customerId')).toBe(
      'customerId',
    );
    expect(normalizeProcessContextStoragePath('companyName')).toBe('companyName');
  });

  it('merges binding core ids into flat process context', () => {
    const merged = mergeBindingCoreIdsIntoProcessContext(
      { companyName: 'Acme' },
      [{ objectType: 'customer', coreId: 59 }],
    );
    expect(merged).toEqual({ companyName: 'Acme', customerId: 59 });
  });

  it('builds parent resolution root with context namespace', () => {
    const root = buildProcessContextResolutionRoot({
      tenantId: 1,
      processInstanceId: 35,
      subjectType: 'workflow',
      subjectId: 0,
      context: { companyName: 'Acme' },
      bindingCoreRefs: [{ objectType: 'customer', coreId: 59 }],
    });

    expect(root.context).toEqual({ companyName: 'Acme' });
    expect(root.entity).toEqual(
      expect.objectContaining({ objectType: 'customer', coreId: 59 }),
    );
  });

  it('resolves flat child context patch from parent runtime paths', () => {
    const parentRoot = buildProcessContextResolutionRoot({
      tenantId: 1,
      processInstanceId: 35,
      subjectType: 'workflow',
      subjectId: 0,
      context: { companyName: 'Acme', customerId: 59 },
    });

    const child = resolveChildContextFromParentPatch(
      { companyName: 'Acme' },
      {
        'context.customerId': 'context.customerId',
        'context.companyName': 'context.companyName',
      },
      parentRoot,
    );

    expect(child).toEqual({
      companyName: 'Acme',
      customerId: 59,
    });
  });
});
