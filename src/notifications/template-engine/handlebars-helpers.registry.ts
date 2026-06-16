import Handlebars from 'handlebars';
import { DateTime } from 'luxon';

export const NOTIFICATION_HANDLEBARS_HELPERS = [
  'formatDate',
  'default',
  'url',
  'join',
] as const;

const DATE_PRESETS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short' },
  medium: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
  datetime: { dateStyle: 'short', timeStyle: 'short' },
};

function coerceDate(value: unknown): DateTime | null {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return DateTime.fromMillis(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = DateTime.fromISO(value, { setZone: true });
    return parsed.isValid ? parsed : null;
  }
  return null;
}

/**
 * Registers whitelisted Handlebars helpers for notification templates.
 */
export function registerNotificationHandlebarsHelpers(
  hbs: typeof Handlebars,
): void {
  hbs.registerHelper('formatDate', function formatDate(
    this: unknown,
    value: unknown,
    ...args: unknown[]
  ) {
    const style =
      typeof args[0] === 'string' && args[0].trim() ? args[0] : 'short';
    const parsed = coerceDate(value);
    if (!parsed) {
      return '';
    }

    const preset = DATE_PRESETS[style] ?? DATE_PRESETS.short;
    return parsed.toLocaleString(preset);
  });

  hbs.registerHelper('default', function defaultHelper(
    value: unknown,
    fallback: unknown,
  ) {
    if (value === undefined || value === null || value === '') {
      return fallback ?? '';
    }
    return value;
  });

  hbs.registerHelper('url', function urlHelper(
    this: { urls?: Record<string, unknown> },
    key: unknown,
  ) {
    if (typeof key !== 'string' || !key.trim()) {
      return '';
    }
    const value = this?.urls?.[key];
    return value == null ? '' : String(value);
  });

  hbs.registerHelper('join', function joinHelper(
    value: unknown,
    separator: unknown,
  ) {
    if (!Array.isArray(value)) {
      return '';
    }
    const sep = typeof separator === 'string' ? separator : ', ';
    return value.map((entry) => String(entry)).join(sep);
  });
}

/**
 * Creates an isolated Handlebars runtime with notification helpers registered.
 */
export function createNotificationHandlebarsRuntime(): typeof Handlebars {
  const runtime = Handlebars.create();
  registerNotificationHandlebarsHelpers(runtime);
  return runtime;
}
