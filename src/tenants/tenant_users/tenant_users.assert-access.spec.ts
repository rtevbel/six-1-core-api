import { TenantUsersService } from './tenant_users.service';
import { SUPER_ADMIN_ROLE_ID } from '../../common/rbac/platform-role-catalog-scope';

describe('TenantUsersService.assertTenantAccess', () => {
  const tenantUsersRepository = {
    findOne: jest.fn(),
  };
  const userRoleRepository = {
    findOne: jest.fn(),
  };
  const tenantTeamRepository = {
    findOne: jest.fn(),
  };
  const service = new TenantUsersService(
    tenantUsersRepository as never,
    userRoleRepository as never,
    tenantTeamRepository as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows Super Admin for any tenant', async () => {
    userRoleRepository.findOne.mockResolvedValue({
      userRoleId: 1,
      roleId: SUPER_ADMIN_ROLE_ID,
    });

    await expect(service.assertTenantAccess(1, 20)).resolves.toEqual({
      allowed: true,
      tenantUserId: null,
      isSuperAdmin: true,
      tenantId: 20,
    });
    expect(tenantUsersRepository.findOne).not.toHaveBeenCalled();
  });

  it('allows members of the route tenant', async () => {
    userRoleRepository.findOne.mockResolvedValue(null);
    tenantUsersRepository.findOne.mockResolvedValue({ tenantUserId: 16 });

    await expect(service.assertTenantAccess(26, 21)).resolves.toEqual({
      allowed: true,
      tenantUserId: 16,
      isSuperAdmin: false,
      tenantId: 21,
    });
  });

  it('rejects non-members of the route tenant', async () => {
    userRoleRepository.findOne.mockResolvedValue(null);
    tenantUsersRepository.findOne.mockResolvedValue(null);

    await expect(service.assertTenantAccess(26, 20)).rejects.toMatchObject({
      message: expect.objectContaining({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    });
  });

  it('resolves tenant from tenantTeamId then checks membership', async () => {
    userRoleRepository.findOne.mockResolvedValue(null);
    tenantTeamRepository.findOne.mockResolvedValue({
      tenantTeamId: 8,
      tenantId: 21,
    });
    tenantUsersRepository.findOne.mockResolvedValue({ tenantUserId: 16 });

    await expect(
      service.assertTenantAccess(26, { tenantTeamId: 8 }),
    ).resolves.toEqual({
      allowed: true,
      tenantUserId: 16,
      isSuperAdmin: false,
      tenantId: 21,
    });
  });

  it('rejects when team belongs to another tenant', async () => {
    userRoleRepository.findOne.mockResolvedValue(null);
    tenantTeamRepository.findOne.mockResolvedValue({
      tenantTeamId: 3,
      tenantId: 20,
    });
    tenantUsersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.assertTenantAccess(26, { tenantTeamId: 3 }),
    ).rejects.toMatchObject({
      message: expect.objectContaining({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    });
  });
});
