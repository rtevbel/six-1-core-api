import {
  busyMsWithinRange,
  intervalsOverlap,
  isFullyCoveredBy,
  mergeIntervals,
} from './interval.utils';

describe('interval.utils', () => {
  it('detects overlaps', () => {
    expect(
      intervalsOverlap(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T12:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T13:00:00Z'),
      ),
    ).toBe(true);
    expect(
      intervalsOverlap(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T12:00:00Z'),
      ),
    ).toBe(false);
  });

  it('merges overlapping intervals', () => {
    const merged = mergeIntervals([
      {
        startUtc: new Date('2026-01-01T10:00:00Z'),
        endUtc: new Date('2026-01-01T12:00:00Z'),
      },
      {
        startUtc: new Date('2026-01-01T11:00:00Z'),
        endUtc: new Date('2026-01-01T13:00:00Z'),
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].endUtc.toISOString()).toBe('2026-01-01T13:00:00.000Z');
  });

  it('checks full coverage', () => {
    expect(
      isFullyCoveredBy(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T12:00:00Z'),
        [
          {
            startUtc: new Date('2026-01-01T09:00:00Z'),
            endUtc: new Date('2026-01-01T13:00:00Z'),
          },
        ],
      ),
    ).toBe(true);
    expect(
      isFullyCoveredBy(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T12:00:00Z'),
        [
          {
            startUtc: new Date('2026-01-01T10:00:00Z'),
            endUtc: new Date('2026-01-01T11:00:00Z'),
          },
        ],
      ),
    ).toBe(false);
  });

  it('computes busy ms clipped to range', () => {
    const ms = busyMsWithinRange(
      [
        {
          startUtc: new Date('2026-01-01T09:00:00Z'),
          endUtc: new Date('2026-01-01T11:00:00Z'),
        },
      ],
      new Date('2026-01-01T10:00:00Z'),
      new Date('2026-01-01T12:00:00Z'),
    );
    expect(ms).toBe(60 * 60 * 1000);
  });
});
