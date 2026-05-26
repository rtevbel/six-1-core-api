import {
  isTemporalListFilterFieldType,
  normalizeTemporalListFilterBound,
} from './list-filter-field-type';

describe('list-filter-field-type', () => {
  it('recognizes temporal catalog field types', () => {
    expect(isTemporalListFilterFieldType('datetime')).toBe(true);
    expect(isTemporalListFilterFieldType('DATE')).toBe(true);
    expect(isTemporalListFilterFieldType('number')).toBe(false);
  });

  it('normalizes date-only gte/lte bounds inclusively', () => {
    expect(normalizeTemporalListFilterBound('2026-01-01', 'gte')).toBe(
      '2026-01-01 00:00:00',
    );
    expect(normalizeTemporalListFilterBound('2026-05-13', 'lte')).toBe(
      '2026-05-13 23:59:59.999999',
    );
  });
});
