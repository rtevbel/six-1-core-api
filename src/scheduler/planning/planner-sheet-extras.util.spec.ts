import { normalizeSheetExtras } from './planner-sheet-extras.util';

describe('normalizeSheetExtras', () => {
  it('returns empty envelope for null/undefined', () => {
    expect(normalizeSheetExtras(null).partnerRecordKeys).toEqual([]);
    expect(normalizeSheetExtras(undefined).predecessors).toEqual([]);
  });

  it('trims and caps skills / keys', () => {
    const out = normalizeSheetExtras({
      requiredSkills: ['  electrical ', '', 12],
      partnerRecordKeys: ['p1', 'p2'],
      requiredMaterials: [{ recordKey: 'm1', qty: 3 }, { recordKey: '', qty: 1 }],
      predecessors: [
        { dependsOnTaskId: 501, dependencyType: 'SS', lagDays: 2 },
        { dependsOnTaskId: -1, dependencyType: 'FS' },
      ],
    });
    expect(out.requiredSkills).toEqual(['electrical']);
    expect(out.partnerRecordKeys).toEqual(['p1', 'p2']);
    expect(out.requiredMaterials).toEqual([{ recordKey: 'm1', qty: 3 }]);
    expect(out.predecessors).toEqual([
      { dependsOnTaskId: 501, dependencyType: 'SS', lagDays: 2 },
    ]);
  });
});
