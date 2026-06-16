import { validatePlatformEventEnvelope } from './event-envelope.validation';

describe('validatePlatformEventEnvelope', () => {
  it('exempts legacy non-platform event names', () => {
    const result = validatePlatformEventEnvelope({
      eventName: 'tenant_user_invited',
      data: {},
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns on missing mandatory platform fields', () => {
    const result = validatePlatformEventEnvelope({
      eventName: 'six1-event.process_step_ready',
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'tenantId is required for platform events',
        'correlationId is required for platform events',
        'entity is required for platform events',
        'data is required for platform events',
      ]),
    );
  });

  it('accepts a complete platform envelope', () => {
    const result = validatePlatformEventEnvelope({
      eventName: 'six1-event.project_created',
      tenantId: 5,
      correlationId: 'corr-1',
      entity: { entityType: 'project', entityId: 1 },
      data: { projectId: 1 },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('errors when data is not a plain object', () => {
    const result = validatePlatformEventEnvelope({
      eventName: 'six1-event.project_created',
      tenantId: 5,
      correlationId: 'corr-1',
      entity: { entityType: 'project', entityId: 1 },
      data: 'invalid',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'data must be a plain object when provided',
    );
  });
});
