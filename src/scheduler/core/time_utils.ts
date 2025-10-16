import { DateTime, Interval } from 'luxon';
import { TimeInterval, Weekday } from './interfaces';

/**
 * Converts a Luxon DateTime object to a Weekday type.
 * @param dt - The Luxon DateTime object.
 * @returns The weekday as a lowercase string (e.g., 'monday', 'tuesday').
 */
export function weekdayFromLuxon(dt: DateTime): Weekday {
  return dt.toFormat('cccc').toLowerCase() as Weekday;
}

/**
 * Builds an array of Luxon Interval objects for a given day based on time slots.
 * @param dtLocal - The Luxon DateTime object representing the day.
 * @param slots - An array of time intervals with start and end times in 'HH:mm:ss' format.
 * @returns An array of Luxon Interval objects for the specified time slots.
 */
export function buildIntervalsForDay(dtLocal: DateTime, slots: TimeInterval[]): Interval[] {
  return slots.map((s) => {
    const [sh, sm, ss] = s.start.split(':').map(Number); // Parse start time
    const [eh, em, es] = s.end.split(':').map(Number);   // Parse end time
    const startDT = dtLocal.set({ hour: sh, minute: sm || 0, second: ss || 0, millisecond: 0 });
    const endDT = dtLocal.set({ hour: eh, minute: em || 0, second: es || 0, millisecond: 0 });
    return Interval.fromDateTimes(startDT, endDT); // Create an interval from start to end
  });
}

/**
 * Checks if a given DateTime object falls within any of the provided intervals.
 * @param dtLocal - The Luxon DateTime object to check.
 * @param intervals - An array of Luxon Interval objects.
 * @returns True if the DateTime is within any interval, otherwise false.
 */
export function isWithinAnyInterval(dtLocal: DateTime, intervals: Interval[]) {
  return intervals.some((i) => i.contains(dtLocal));
}

/**
 * Finds the next interval start time after a given DateTime.
 * @param dtLocal - The Luxon DateTime object to compare.
 * @param intervals - An array of Luxon Interval objects.
 * @returns The next start time as a Luxon DateTime object, or null if none exists.
 */
export function nextStartAfter(dtLocal: DateTime, intervals: Interval[]) {
    const c = intervals
        .map((i) => i.start) // Extract start times
        .filter((s) => s !== null && s > dtLocal) // Filter start times after the given DateTime
        .sort((a, b) => (a !== null && b !== null ? a.toMillis() - b.toMillis() : 0)); // Sort start times in ascending order
    return c[0] || null; // Return the first start time or null if none exists
}