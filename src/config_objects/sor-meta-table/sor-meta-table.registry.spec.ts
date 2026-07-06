import { listSorMetaTableObjectTypes } from './sor-meta-table.registry';

describe('sor-meta-table.registry', () => {
  it('lists known sor_bound meta object types', () => {
    const types = listSorMetaTableObjectTypes();
    expect(types).toContain('customer');
    expect(types).toContain('project');
    expect(types).toContain('resource');
  });
});
