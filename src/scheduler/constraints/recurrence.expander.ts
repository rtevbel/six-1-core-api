import { DateTime } from 'luxon';
import { UtcInterval } from './constraint.types';

/**
 * Documented RRULE subset for resource_availability.recurrence_rule:
 * - FREQ=DAILY[;INTERVAL=n][;COUNT=n][;UNTIL=YYYYMMDD]
 * - FREQ=WEEKLY[;INTERVAL=n][;BYDAY=MO,TU,...][;COUNT=n][;UNTIL=YYYYMMDD]
 *
 * Unsupported rules throw with code AVAILABILITY_RULE_UNSUPPORTED (caller maps).
 */
export class UnsupportedRecurrenceRuleError extends Error {
  constructor(public readonly rule: string) {
    super(`Unsupported recurrence rule: ${rule}`);
    this.name = 'UnsupportedRecurrenceRuleError';
  }
}

interface ParsedRule {
  freq: 'DAILY' | 'WEEKLY';
  interval: number;
  count?: number;
  until?: DateTime;
  byDay?: number[]; // Luxon weekday 1=Mon..7=Sun
}

const BYDAY_MAP: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

export function parseRecurrenceRule(rule: string): ParsedRule {
  const parts = rule
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  const map = new Map<string, string>();
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (!k || v === undefined) {
      throw new UnsupportedRecurrenceRuleError(rule);
    }
    map.set(k.toUpperCase(), v.toUpperCase());
  }

  const freq = map.get('FREQ');
  if (freq !== 'DAILY' && freq !== 'WEEKLY') {
    throw new UnsupportedRecurrenceRuleError(rule);
  }

  const interval = map.has('INTERVAL') ? Number(map.get('INTERVAL')) : 1;
  if (!Number.isFinite(interval) || interval < 1) {
    throw new UnsupportedRecurrenceRuleError(rule);
  }

  let count: number | undefined;
  if (map.has('COUNT')) {
    count = Number(map.get('COUNT'));
    if (!Number.isFinite(count) || count < 1) {
      throw new UnsupportedRecurrenceRuleError(rule);
    }
  }

  let until: DateTime | undefined;
  if (map.has('UNTIL')) {
    const raw = map.get('UNTIL')!;
    until = DateTime.fromFormat(raw.slice(0, 8), 'yyyyMMdd', { zone: 'utc' });
    if (!until.isValid) {
      throw new UnsupportedRecurrenceRuleError(rule);
    }
    until = until.endOf('day');
  }

  let byDay: number[] | undefined;
  if (map.has('BYDAY')) {
    byDay = map
      .get('BYDAY')!
      .split(',')
      .map((d) => BYDAY_MAP[d.trim()]);
    if (byDay.some((d) => !d)) {
      throw new UnsupportedRecurrenceRuleError(rule);
    }
  }

  // Reject unknown keys beyond the supported subset
  const allowed = new Set(['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY']);
  for (const key of map.keys()) {
    if (!allowed.has(key)) {
      throw new UnsupportedRecurrenceRuleError(rule);
    }
  }
  if (freq === 'DAILY' && byDay) {
    throw new UnsupportedRecurrenceRuleError(rule);
  }

  return { freq, interval, count, until, byDay };
}

/**
 * Expands a template interval using an RRULE subset into concrete UTC intervals
 * that intersect [rangeStart, rangeEnd).
 */
export function expandRecurringInterval(
  templateStart: Date,
  templateEnd: Date,
  rule: string,
  rangeStart: Date,
  rangeEnd: Date,
): UtcInterval[] {
  const parsed = parseRecurrenceRule(rule);
  const tplStart = DateTime.fromJSDate(templateStart, { zone: 'utc' });
  const tplEnd = DateTime.fromJSDate(templateEnd, { zone: 'utc' });
  const durationMs = tplEnd.diff(tplStart).as('milliseconds');
  if (durationMs <= 0) return [];

  const rangeFrom = DateTime.fromJSDate(rangeStart, { zone: 'utc' });
  const rangeTo = DateTime.fromJSDate(rangeEnd, { zone: 'utc' });
  const out: UtcInterval[] = [];

  let occurrence = 0;
  let cursor = tplStart;
  const maxIterations = 366 * 3;

  for (let i = 0; i < maxIterations; i++) {
    if (parsed.until && cursor > parsed.until) break;
    if (parsed.count !== undefined && occurrence >= parsed.count) break;
    if (cursor >= rangeTo) break;

    const matchesDow =
      parsed.freq === 'DAILY' ||
      !parsed.byDay ||
      parsed.byDay.includes(cursor.weekday);

    if (matchesDow) {
      const start = cursor;
      const end = cursor.plus({ milliseconds: durationMs });
      occurrence += 1;
      if (end > rangeFrom && start < rangeTo) {
        out.push({ startUtc: start.toJSDate(), endUtc: end.toJSDate() });
      }
      if (parsed.count !== undefined && occurrence >= parsed.count) break;
    }

    if (parsed.freq === 'DAILY') {
      cursor = cursor.plus({ days: parsed.interval });
    } else {
      // WEEKLY: advance day-by-day within week, then jump by interval weeks
      const next = cursor.plus({ days: 1 });
      if (parsed.byDay && next.weekday < cursor.weekday) {
        // wrapped to next week — apply INTERVAL-1 extra weeks
        cursor = next.plus({ weeks: parsed.interval - 1 });
      } else if (!parsed.byDay) {
        cursor = cursor.plus({ weeks: parsed.interval });
      } else {
        cursor = next;
      }
    }
  }

  return out;
}
