import { DateTime } from 'luxon';
import { UtcInterval } from './constraint.types';

/** Half-open overlap: [aStart, aEnd) intersects [bStart, bEnd). */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function mergeIntervals(intervals: UtcInterval[]): UtcInterval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort(
    (a, b) => a.startUtc.getTime() - b.startUtc.getTime(),
  );
  const out: UtcInterval[] = [
    { startUtc: sorted[0].startUtc, endUtc: sorted[0].endUtc },
  ];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.startUtc.getTime() <= last.endUtc.getTime()) {
      if (cur.endUtc.getTime() > last.endUtc.getTime()) {
        last.endUtc = cur.endUtc;
      }
    } else {
      out.push({ startUtc: cur.startUtc, endUtc: cur.endUtc });
    }
  }
  return out;
}

/** True when [start,end) is fully covered by the union of windows. */
export function isFullyCoveredBy(
  startUtc: Date,
  endUtc: Date,
  windows: UtcInterval[],
): boolean {
  if (endUtc.getTime() <= startUtc.getTime()) return false;
  const merged = mergeIntervals(windows);
  let cursor = startUtc.getTime();
  const end = endUtc.getTime();
  for (const w of merged) {
    const ws = w.startUtc.getTime();
    const we = w.endUtc.getTime();
    if (we <= cursor) continue;
    if (ws > cursor) return false;
    cursor = Math.max(cursor, we);
    if (cursor >= end) return true;
  }
  return cursor >= end;
}

export function intervalMs(startUtc: Date, endUtc: Date): number {
  return Math.max(0, endUtc.getTime() - startUtc.getTime());
}

export function busyMsWithinRange(
  busy: UtcInterval[],
  fromUtc: Date,
  toUtc: Date,
): number {
  let total = 0;
  const from = fromUtc.getTime();
  const to = toUtc.getTime();
  for (const b of busy) {
    const s = Math.max(from, b.startUtc.getTime());
    const e = Math.min(to, b.endUtc.getTime());
    if (e > s) total += e - s;
  }
  return total;
}

export function dateOnlyUtc(isoDate: string): {
  startUtc: Date;
  endUtc: Date;
} {
  const start = DateTime.fromISO(isoDate, { zone: 'utc' }).startOf('day');
  const end = start.plus({ days: 1 });
  return { startUtc: start.toJSDate(), endUtc: end.toJSDate() };
}

export function eachDateInclusive(
  startDate: string,
  endDate: string,
): string[] {
  let cur = DateTime.fromISO(startDate, { zone: 'utc' }).startOf('day');
  const end = DateTime.fromISO(endDate, { zone: 'utc' }).startOf('day');
  if (!cur.isValid || !end.isValid || cur > end) return [];
  const out: string[] = [];
  while (cur <= end) {
    out.push(cur.toISODate()!);
    cur = cur.plus({ days: 1 });
  }
  return out;
}
