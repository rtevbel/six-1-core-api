import { parseAssigneeSpec } from './process-step-assignee-spec.types';

describe('parseAssigneeSpec', () => {
  it('returns null for unset spec', () => {
    expect(parseAssigneeSpec(null)).toBeNull();
    expect(parseAssigneeSpec(undefined)).toBeNull();
  });

  it('returns null for invalid spec (no implicit event_actor default)', () => {
    expect(parseAssigneeSpec({})).toBeNull();
    expect(parseAssigneeSpec({ type: '' })).toBeNull();
  });

  it('parses explicit_user_ids', () => {
    expect(
      parseAssigneeSpec({ type: 'explicit_user_ids', userIds: [1, 2] }),
    ).toEqual({ type: 'explicit_user_ids', userIds: [1, 2] });
  });

  it('parses event_payload_field', () => {
    expect(
      parseAssigneeSpec({
        type: 'event_payload_field',
        path: 'data.managerId',
      }),
    ).toEqual({ type: 'event_payload_field', path: 'data.managerId' });
  });

  it('parses tenant_role', () => {
    expect(
      parseAssigneeSpec({ type: 'tenant_role', roleName: 'Manager' }),
    ).toEqual({ type: 'tenant_role', roleName: 'Manager' });
  });
});
