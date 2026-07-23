import {
  ASSIGNEE_PAYLOAD_PATHS,
  parseRecipientSpec,
} from './recipient-spec.types';

describe('recipient-spec.types', () => {
  it('parses assignee and tenant_role specs', () => {
    expect(parseRecipientSpec({ type: 'assignee' })).toEqual({
      type: 'assignee',
    });
    expect(
      parseRecipientSpec({
        type: 'tenant_role',
        permission: 'finance.approve',
      }),
    ).toEqual({
      type: 'tenant_role',
      permission: 'finance.approve',
    });
  });

  it('parses multi-role and multi-permission tenant_role specs from the UI', () => {
    expect(
      parseRecipientSpec({
        type: 'tenant_role',
        roleNames: ['Customer', 'Manager', 'Admin'],
      }),
    ).toEqual({
      type: 'tenant_role',
      roleNames: ['Customer', 'Manager', 'Admin'],
    });

    expect(
      parseRecipientSpec({
        type: 'tenant_role',
        permissions: ['finance.approve', 'projects.view'],
      }),
    ).toEqual({
      type: 'tenant_role',
      permissions: ['finance.approve', 'projects.view'],
    });

    expect(
      parseRecipientSpec({
        type: 'tenant_role',
        roleNames: ['Manager'],
      }),
    ).toEqual({
      type: 'tenant_role',
      roleName: 'Manager',
    });
  });

  it('does not rewrite incomplete tenant_role specs to event_actor', () => {
    expect(parseRecipientSpec({ type: 'tenant_role' })).toEqual({
      type: 'tenant_role',
    });
  });

  it('exposes default assignee payload paths', () => {
    expect(ASSIGNEE_PAYLOAD_PATHS).toContain('data.assigneeId');
  });
});
