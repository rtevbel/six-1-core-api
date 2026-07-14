import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionDescriptionEntity } from './entities/permission_description.entity';
import { RolePermissionEntity } from '../roles/entities/role-permission.entity';
import { ConfigObjectsService } from '../config_objects/config_objects.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  const rolePermissionRepository = {
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
    update: jest.fn(),
  };
  const permissionRepository = {
    findOneByOrFail: jest.fn().mockResolvedValue({ permissionId: 101 }),
    update: jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(PermissionEntity),
          useValue: permissionRepository,
        },
        {
          provide: getRepositoryToken(PermissionDescriptionEntity),
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

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deletes junction row when rolePermissionId is provided (unassign)', async () => {
    await service.update(1, 101, {
      permissionId: 101,
      descriptions: [],
      roles: [{ rolePermissionId: 292, roleId: 7, permissionId: 101 }],
    });

    expect(rolePermissionRepository.delete).toHaveBeenCalledWith({
      rolePermissionId: 292,
    });
    expect(rolePermissionRepository.update).not.toHaveBeenCalled();
    expect(rolePermissionRepository.save).not.toHaveBeenCalled();
  });
});
