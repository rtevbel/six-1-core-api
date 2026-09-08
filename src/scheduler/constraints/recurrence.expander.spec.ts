import {
  expandRecurringInterval,
  parseRecurrenceRule,
  UnsupportedRecurrenceRuleError,
} from './recurrence.expander';

describe('recurrence.expander', () => {
  it('parses DAILY with interval', () => {
    expect(parseRecurrenceRule('FREQ=DAILY;INTERVAL=2')).toEqual({
      freq: 'DAILY',
      interval: 2,
      count: undefined,
      until: undefined,
      byDay: undefined,
    });
  });

  it('parses WEEKLY BYDAY', () => {
    const parsed = parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(parsed.freq).toBe('WEEKLY');
    expect(parsed.byDay).toEqual([1, 3, 5]);
  });

  it('rejects unsupported FREQ', () => {
    expect(() => parseRecurrenceRule('FREQ=MONTHLY')).toThrow(
      UnsupportedRecurrenceRuleError,
    );
  });

  it('expands daily occurrences inside range', () => {
    const start = new Date('2026-09-01T09:00:00.000Z');
    const end = new Date('2026-09-01T17:00:00.000Z');
    const rangeStart = new Date('2026-09-01T00:00:00.000Z');
    const rangeEnd = new Date('2026-09-04T00:00:00.000Z');
    const windows = expandRecurringInterval(
      start,
      end,
      'FREQ=DAILY;COUNT=3',
      rangeStart,
      rangeEnd,
    );
    expect(windows).toHaveLength(3);
    expect(windows[0].startUtc.toISOString()).toBe('2026-09-01T09:00:00.000Z');
    expect(windows[2].startUtc.toISOString()).toBe('2026-09-03T09:00:00.000Z');
  });
});
