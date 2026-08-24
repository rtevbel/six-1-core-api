import { applyTenantUserInvitationCreateDefaults } from './invitation-create.defaults';

describe('applyTenantUserInvitationCreateDefaults', () => {
  it('mints a token, forces pending, and uses actor as invitedBy', () => {
    const out = applyTenantUserInvitationCreateDefaults({
      tenantId: 20,
      actorUserId: 7,
      email: '  new.user@example.com  ',
      roleId: 3,
      status: 'accepted',
      token: '  ',
      userId: 0,
    });
    expect(out.email).toBe('new.user@example.com');
    expect(out.status).toBe('pending');
    expect(out.invitedBy).toBe(7);
    expect(out.userId).toBeNull();
    expect(out.token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps a caller-supplied token when present', () => {
    const out = applyTenantUserInvitationCreateDefaults({
      tenantId: 1,
      actorUserId: 2,
      email: 'a@b.co',
      roleId: 1,
      token: 'preset-token',
      invitedBy: 9,
    });
    expect(out.token).toBe('preset-token');
    expect(out.invitedBy).toBe(9);
  });
});
