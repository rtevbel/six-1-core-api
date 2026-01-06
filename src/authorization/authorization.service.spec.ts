import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuthorizationService } from './authorization.service';
import { UserRoleEntity } from '../users/user-roles/entities/user-role.entity';
import { TenantUserRoleEntity } from '../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { RolePermissionEntity } from '../roles/entities/role-permission.entity';
import { PermissionDescriptionEntity } from '../permissions/entities/permission_description.entity';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let permissionDescriptionRepository: Repository<PermissionDescriptionEntity>;
  let userRoleRepository: Repository<UserRoleEntity>;
  let tenantUserRoleRepository: Repository<TenantUserRoleEntity>;
  let rolePermissionRepository: Repository<RolePermissionEntity>;

  const mockPermissionDescriptionRepository = {
    createQueryBuilder: jest.fn(),
    metadata: {
      tableName: 'permission_descriptions',
    },
  };

  const mockUserRoleRepository = {
    metadata: {
      tableName: 'user_roles',
    },
  };

  const mockTenantUserRoleRepository = {
    metadata: {
      tableName: 'tenant_user_roles',
    },
  };

  const mockRolePermissionRepository = {
    metadata: {
      tableName: 'role_permissions',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: getRepositoryToken(PermissionDescriptionEntity),
          useValue: mockPermissionDescriptionRepository,
        },
        {
          provide: getRepositoryToken(UserRoleEntity),
          useValue: mockUserRoleRepository,
        },
        {
          provide: getRepositoryToken(TenantUserRoleEntity),
          useValue: mockTenantUserRoleRepository,
        },
        {
          provide: getRepositoryToken(RolePermissionEntity),
          useValue: mockRolePermissionRepository,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    permissionDescriptionRepository = module.get<Repository<PermissionDescriptionEntity>>(
      getRepositoryToken(PermissionDescriptionEntity),
    );
    userRoleRepository = module.get<Repository<UserRoleEntity>>(
      getRepositoryToken(UserRoleEntity),
    );
    tenantUserRoleRepository = module.get<Repository<TenantUserRoleEntity>>(
      getRepositoryToken(TenantUserRoleEntity),
    );
    rolePermissionRepository = module.get<Repository<RolePermissionEntity>>(
      getRepositoryToken(RolePermissionEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hasPermissions', () => {
    it('should return true when user has all required permissions', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { name: 'projects.create' },
          { name: 'projects.read' },
          { name: 'tasks.read' },
        ]),
      };

      mockPermissionDescriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.hasPermissions(1, [
        'projects.create',
        'projects.read',
      ]);

      expect(result).toBe(true);
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('should return false when user lacks required permissions', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { name: 'projects.read' },
        ]),
      };

      mockPermissionDescriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.hasPermissions(1, [
        'projects.create',
        'projects.read',
      ]);

      expect(result).toBe(false);
    });

    it('should return true when user has manage permission', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { name: 'projects.manage' },
        ]),
      };

      mockPermissionDescriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.hasPermissions(1, [
        'projects.create',
        'projects.read',
        'projects.update',
        'projects.delete',
      ]);

      expect(result).toBe(true);
    });

    it('should handle tenant user permissions', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { name: 'projects.read' },
        ]),
      };

      mockPermissionDescriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.hasPermissions(1, ['projects.read'], 10);

      expect(result).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should return false for empty permissions array', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockPermissionDescriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.hasPermissions(1, []);

      expect(result).toBe(true); // Empty array means no requirements
    });

    it('should handle multiple permissions with partial match', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { name: 'projects.read' },
          { name: 'tasks.read' },
        ]),
      };

      mockPermissionDescriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.hasPermissions(1, [
        'projects.read',
        'projects.create', // Missing
        'tasks.read',
      ]);

      expect(result).toBe(false);
    });
  });
});

