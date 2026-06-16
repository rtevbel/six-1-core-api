import {
  PLATFORM_EVENT_CATALOG_SEED,
  getPlatformEventCatalogSeedEntry,
  resolveCanonicalEventName,
} from './platform-event-catalog.seed';

describe('platform-event-catalog.seed', () => {
  it('has unique event names', () => {
    const names = PLATFORM_EVENT_CATALOG_SEED.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks deprecated notification shims', () => {
    const shim = getPlatformEventCatalogSeedEntry(
      'six1-event.notification.process_step_completed',
    );
    expect(shim?.deprecated).toBe(true);
    expect(shim?.canonicalName).toBe('six1-event.process_step_completed');
    expect(resolveCanonicalEventName(shim!.name)).toBe(
      'six1-event.process_step_completed',
    );
  });

  it('includes process lifecycle and domain events from P0 catalog', () => {
    const names = new Set(PLATFORM_EVENT_CATALOG_SEED.map((e) => e.name));
    expect(names.has('six1-event.process_step_ready')).toBe(true);
    expect(names.has('six1-event.config_object_instance.updated')).toBe(true);
    expect(names.has('six1-event.sor_bound_instance.updated')).toBe(true);
    expect(names.has('six1-event.project_created')).toBe(true);
    expect(names.has('six1-event.project_status_changed')).toBe(true);
    expect(names.has('six1-event.task_status_changed')).toBe(true);
  });

  it('sets is_system on all seeded entries', () => {
    for (const entry of PLATFORM_EVENT_CATALOG_SEED) {
      expect(entry.isSystem).toBe(true);
      expect(entry.category).toBeTruthy();
      expect(entry.schemaVersion).toBe('1.0');
    }
  });
});
