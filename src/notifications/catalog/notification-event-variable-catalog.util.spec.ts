import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA } from '../../events/seed/platform-event-payload-schema.util';
import {
  buildEventPayloadCatalogEntries,
  buildEventVariableCatalogEntries,
  buildEventVarsCatalogEntries,
  buildPayloadSchemaCatalogEntries,
  normalizeCatalogEventName,
} from './notification-event-variable-catalog.util';

describe('notification-event-variable-catalog.util', () => {
  it('normalizes six1 event names', () => {
    expect(normalizeCatalogEventName('six1-event.project_created')).toBe(
      'project_created',
    );
  });

  it('builds legacy and payload entries for EventVars-only events', () => {
    const entries = buildEventVarsCatalogEntries('project_created');
    expect(entries.some((entry) => entry.path === 'projectName')).toBe(true);
    expect(entries.some((entry) => entry.path === 'payload.projectId')).toBe(
      true,
    );
  });

  it('builds payload entries from catalog payload_schema', () => {
    const entries = buildPayloadSchemaCatalogEntries(
      SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA,
    );

    expect(entries.some((entry) => entry.path === 'payload.coreId')).toBe(true);
    expect(entries.some((entry) => entry.path === 'payload.objectType')).toBe(
      true,
    );
    expect(entries.some((entry) => entry.path === 'payload.changedFields')).toBe(
      true,
    );
    expect(entries.every((entry) => entry.path.startsWith('payload.'))).toBe(
      true,
    );
  });

  it('prefers payload_schema over EventVars when schema is present', () => {
    const entries = buildEventPayloadCatalogEntries({
      eventName: PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED,
      payloadSchema: SOR_BOUND_INSTANCE_PAYLOAD_SCHEMA,
    });

    expect(entries.some((entry) => entry.path === 'payload.coreId')).toBe(true);
    expect(entries.some((entry) => entry.path === 'projectName')).toBe(false);
  });

  it('falls back to EventVars when payload_schema is absent', () => {
    const entries = buildEventPayloadCatalogEntries({
      eventName: 'project_created',
      payloadSchema: null,
    });

    expect(entries.some((entry) => entry.path === 'payload.projectId')).toBe(
      true,
    );
  });

  it('keeps buildEventVariableCatalogEntries as EventVars shim alias', () => {
    expect(buildEventVariableCatalogEntries('project_created')).toEqual(
      buildEventVarsCatalogEntries('project_created'),
    );
  });
});
