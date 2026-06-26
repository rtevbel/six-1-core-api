import { getByPath } from '../context/notification-context-path.util';
import type { NotificationContext } from '../context/notification-context.types';

/** Maps legacy flat template keys to notification context dot-paths. */
const LEGACY_TEMPLATE_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ['projectName', 'entity.fields.name'],
  ['taskName', 'entity.fields.name'],
  ['recipientName', 'recipient.name'],
  ['recipientEmail', 'recipient.email'],
  ['actorName', 'actor.name'],
  ['actorEmail', 'actor.email'],
  ['tenantName', 'tenant.name'],
  ['projectUrl', 'urls.project'],
  ['taskUrl', 'urls.task'],
  ['processRunnerUrl', 'urls.processRunner'],
  ['verificationUrl', 'urls.verification'],
];

export function getLegacyTemplateAliasKeys(): string[] {
  return LEGACY_TEMPLATE_ALIASES.map(([flatKey]) => flatKey);
}

function asContextRecord(
  context: NotificationContext,
): Record<string, unknown> {
  return context as unknown as Record<string, unknown>;
}

/**
 * Builds the Handlebars render view with legacy flat-key aliases (NV4 shim).
 */
export function buildHandlebarsRenderView(
  context: NotificationContext,
  legacyFlat?: Record<string, unknown>,
): Record<string, unknown> {
  const view: Record<string, unknown> = {
    ...asContextRecord(context),
    ...(legacyFlat ?? {}),
  };

  const contextRecord = asContextRecord(context);
  for (const [flatKey, path] of LEGACY_TEMPLATE_ALIASES) {
    if (view[flatKey] !== undefined && view[flatKey] !== null && view[flatKey] !== '') {
      continue;
    }
    const value = getByPath(contextRecord, path);
    if (value !== undefined && value !== null && value !== '') {
      view[flatKey] = value;
    }
  }

  return view;
}

export function findEmptyReferencedPaths(
  view: Record<string, unknown>,
  referencedPaths: string[],
): string[] {
  return referencedPaths.filter((path) => {
    const value = getByPath(view, path);
    return value === undefined || value === null || value === '';
  });
}
