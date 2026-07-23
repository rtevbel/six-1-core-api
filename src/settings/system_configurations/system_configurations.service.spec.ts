import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { SystemConfigurationsService } from './system_configurations.service';
import { SystemSettingGroupEntity } from './entities/system-setting-group.entity';
import { SystemSettingDefinitionEntity } from './entities/system-setting-definition.entity';
import { SystemSettingValueEntity } from './entities/system-setting-value.entity';
import { SecretEncryptionService } from './secret-encryption.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { SYSTEM_SETTING_SECRET_MASK } from './constants';
import { GLOBAL_SYSTEM_TENANT_ID } from '../../common/utils/tenant-scope.util';

describe('SystemConfigurationsService', () => {
  let service: SystemConfigurationsService;
  const groupsRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ groupId: 1, ...x })),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const definitionsRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ definitionId: 1, ...x })),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const valuesRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ valueId: 1, ...x })),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const secretEncryption = {
    encrypt: jest.fn((plain: string) => ({
      v: 1 as const,
      iv: 'iv',
      tag: 'tag',
      ciphertext: Buffer.from(plain).toString('base64'),
    })),
    decrypt: jest.fn(() => 'decrypted-secret'),
  };
  const authorizationService = {
    hasPermissions: jest.fn(async () => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigurationsService,
        { provide: getRepositoryToken(SystemSettingGroupEntity), useValue: groupsRepo },
        {
          provide: getRepositoryToken(SystemSettingDefinitionEntity),
          useValue: definitionsRepo,
        },
        { provide: getRepositoryToken(SystemSettingValueEntity), useValue: valuesRepo },
        { provide: SecretEncryptionService, useValue: secretEncryption },
        { provide: AuthorizationService, useValue: authorizationService },
      ],
    }).compile();

    service = module.get(SystemConfigurationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects tenant override when not overridable', async () => {
    definitionsRepo.findOne.mockResolvedValue({
      definitionId: 1,
      settingKey: 'feature_flags.x',
      valueType: 'boolean',
      isActive: true,
      isReadonly: false,
      isTenantOverridable: false,
      isSensitive: false,
      constraintsJson: null,
      group: { groupKey: 'feature_flags' },
    });
    await expect(
      service.setValue(1, { settingKey: 'feature_flags.x', value: true, tenantId: 5 }, 5),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('rejects tenant admin writing global values', async () => {
    definitionsRepo.findOne.mockResolvedValue({
      definitionId: 1,
      settingKey: 'auth.session_timeout_seconds',
      valueType: 'number',
      isActive: true,
      isReadonly: false,
      isTenantOverridable: true,
      isSensitive: false,
      constraintsJson: { min: 1 },
      group: { groupKey: 'auth' },
    });
    await expect(
      service.setValue(
        1,
        { settingKey: 'auth.session_timeout_seconds', value: 100 },
        5,
      ),
    ).rejects.toThrow(/cannot set global/);
  });

  it('masks secrets on setValue response', async () => {
    definitionsRepo.findOne.mockResolvedValue({
      definitionId: 2,
      settingKey: 'integrations.smtp_password',
      valueType: 'secret',
      isActive: true,
      isReadonly: false,
      isTenantOverridable: true,
      isSensitive: true,
      constraintsJson: null,
      group: { groupKey: 'integrations' },
    });
    valuesRepo.findOne.mockResolvedValue(null);
    authorizationService.hasPermissions.mockResolvedValue(true);

    const view = await service.setValue(
      1,
      { settingKey: 'integrations.smtp_password', value: 'p@ss' },
      null,
    );
    expect(secretEncryption.encrypt).toHaveBeenCalledWith('p@ss');
    expect(view.value).toBe(SYSTEM_SETTING_SECRET_MASK);
    expect(view.isMasked).toBe(true);
  });

  it('resolve prefers tenant override over global over default', async () => {
    const def = {
      definitionId: 10,
      settingKey: 'notifications.email_enabled',
      valueType: 'boolean' as const,
      isActive: true,
      isSensitive: false,
      defaultValue: false,
      group: { groupKey: 'notifications' },
    };
    definitionsRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([def]),
    });
    valuesRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          definitionId: 10,
          tenantId: GLOBAL_SYSTEM_TENANT_ID,
          valueJson: false,
          valueId: 1,
        },
        {
          definitionId: 10,
          tenantId: 42,
          valueJson: true,
          valueId: 2,
        },
      ]),
    });

    const result = await service.resolve(1, { tenantId: 42 });
    expect(result.groups.notifications['notifications.email_enabled'].value).toBe(
      true,
    );
    expect(
      result.groups.notifications['notifications.email_enabled'].source,
    ).toBe('tenant_override');
  });
});
