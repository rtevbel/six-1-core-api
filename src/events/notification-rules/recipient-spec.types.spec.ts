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

  it('exposes default assignee payload paths', () => {
    expect(ASSIGNEE_PAYLOAD_PATHS).toContain('data.assigneeId');
  });
});
