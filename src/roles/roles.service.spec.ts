import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RoleEntity } from './entities/role.entity';
import { RoleDescriptionEntity } from './entities/role-description.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { ConfigObjectsService } from '../config_objects/config_objects.service';

describe('RolesService', () => {
  let service: RolesService;
  const rolePermissionRepository = {
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
    update: jest.fn(),
  };
  const roleRepository = {
    findOne: jest.fn().mockResolvedValue({ roleId: 7 }),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: roleRepository,
        },
        {
          provide: getRepositoryToken(RoleDescriptionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(RolePermissionEntity),
          useValue: rolePermissionRepository,
        },
        {
          provide: ConfigObjectsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deletes junction row when rolePermissionId is provided (unassign)', async () => {
    await service.update(1, 7, {
      roleId: 7,
      descriptions: [],
      permissions: [{ rolePermissionId: 292, permissionId: 101, roleId: 7 }],
    });

    expect(rolePermissionRepository.delete).toHaveBeenCalledWith({
      rolePermissionId: 292,
    });
    expect(rolePermissionRepository.update).not.toHaveBeenCalled();
    expect(rolePermissionRepository.save).not.toHaveBeenCalled();
  });
});
