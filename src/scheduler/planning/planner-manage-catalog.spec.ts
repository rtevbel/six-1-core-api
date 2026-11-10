import {
  buildManageCategoryCatalogEntry,
  listManageCategoryCatalog,
} from './planner-manage-catalog';

describe('planner-manage-catalog', () => {
  it('lists six upsert categories with scenario_draft binding', () => {
    const list = listManageCategoryCatalog();
    expect(list.map((c) => c.category).sort()).toEqual([
      'equipment',
      'material',
      'partner',
      'person',
      'project',
      'team',
    ]);
    for (const entry of list) {
      expect(entry.bindingMode).toBe('scenario_draft');
      expect(entry.writesLiveMaster).toBe(false);
      expect(entry.objectType).toMatch(/^planner_manage_/);
      expect(entry.processKey).toMatch(/^planner\.manage\./);
      expect(entry.fields.length).toBeGreaterThan(0);
    }
  });

  it('keeps name required on every category schema', () => {
    const project = buildManageCategoryCatalogEntry('project');
    const name = project.fields.find((f) => f.fieldKey === 'name');
    expect(name?.required).toBe(true);
    expect(name?.path).toBe('name');
  });
});
