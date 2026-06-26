import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigObjectsService } from '../config_objects.service';
import { ConfigObjectVerificationRuleEntity } from '../entities/config_object_verification_rule.entity';
import { CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL } from './config-verification.constants';
import { ConfigVerificationService } from './config-verification.service';
import { SystemTableVerificationService } from './system-table-verification.service';
import { ConfigVerificationRateLimitService } from './config-verification-rate-limit.service';
import { ConfigObjectVerificationAuditService } from './config-object-verification-audit.service';

describe('ConfigVerificationService', () => {
  let service: ConfigVerificationService;
  let verificationRuleRepo: { findOne: jest.Mock };
  let configObjectsService: {
    getObjectSchema: jest.Mock;
    findSorBoundInstanceByMetaField: jest.Mock;
    resolveObjectInstance: jest.Mock;
    applySorBoundInstancePatch: jest.Mock;
  };
  let systemTableVerificationService: {
    findByTokenField: jest.Mock;
    applyVerificationPatch: jest.Mock;
  };
  let rateLimitService: { checkAndRecord: jest.Mock };
  let verificationAuditService: { record: jest.Mock };

  const customerSchema = {
    configObject: {
      configObjectId: 120,
      bindingMode: 'sor_bound',
      verificationFieldMap: {
        tokenField: 'verification_token',
        expiresAtField: 'token_expires_at',
        verifiedField: 'email_verified',
        defaultTtlHours: 24,
      },
    },
    fields: [],
  };

  beforeEach(async () => {
    verificationRuleRepo = { findOne: jest.fn().mockResolvedValue(null) };
    configObjectsService = {
      getObjectSchema: jest.fn().mockResolvedValue(customerSchema),
      findSorBoundInstanceByMetaField: jest.fn(),
      resolveObjectInstance: jest.fn(),
      applySorBoundInstancePatch: jest.fn(),
    };
    systemTableVerificationService = {
      findByTokenField: jest.fn(),
      applyVerificationPatch: jest.fn(),
    };
    rateLimitService = {
      checkAndRecord: jest.fn().mockReturnValue({ allowed: true, retryAfterSeconds: 0 }),
    };
    verificationAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigVerificationService,
        {
          provide: getRepositoryToken(ConfigObjectVerificationRuleEntity),
          useValue: verificationRuleRepo,
        },
        {
          provide: ConfigObjectsService,
          useValue: configObjectsService,
        },
        {
          provide: SystemTableVerificationService,
          useValue: systemTableVerificationService,
        },
        {
          provide: ConfigVerificationRateLimitService,
          useValue: rateLimitService,
        },
        {
          provide: ConfigObjectVerificationAuditService,
          useValue: verificationAuditService,
        },
      ],
    }).compile();

    service = module.get(ConfigVerificationService);
  });

  function mockValidCustomerRecord(): void {
    configObjectsService.findSorBoundInstanceByMetaField.mockResolvedValue({
      coreId: 42,
      metaJson: {
        verification_token: 'tok-valid',
        token_expires_at: '2099-01-01T00:00:00.000Z',
        email_verified: false,
      },
    });
    configObjectsService.resolveObjectInstance.mockResolvedValue({
      resolutionMode: 'sor_bound',
      dynamicFields: {
        verification_token: 'tok-valid',
        token_expires_at: '2099-01-01T00:00:00.000Z',
        email_verified: false,
      },
    });
    configObjectsService.applySorBoundInstancePatch.mockResolvedValue({
      core: { customerId: 42 },
      metaJson: {
        email_verified: true,
        verification_token: null,
        token_expires_at: null,
      },
    });
  }

  it('verifyConfigObjectEmail delegates to verify_email trigger', async () => {
    mockValidCustomerRecord();

    const result = await service.verifyConfigObjectEmail({
      objectType: 'customer',
      token: 'tok-valid',
      tenantId: 5,
    });

    expect(result.success).toBe(true);
    expect(result.coreId).toBe(42);
    expect(verificationAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success', objectType: 'customer' }),
    );
  });

  it('verifies a valid token and clears verification meta', async () => {
    mockValidCustomerRecord();

    const result = await service.executeTrigger({
      trigger: CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
      objectType: 'customer',
      tenantId: 5,
      input: { token: 'tok-valid' },
    });

    expect(result).toEqual({
      success: true,
      objectType: 'customer',
      coreId: 42,
      emailVerified: true,
      changedFields: [
        'email_verified',
        'verification_token',
        'token_expires_at',
      ],
    });
    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith({
      tenantId: 5,
      objectType: 'customer',
      coreId: 42,
      metaPatch: {
        email_verified: true,
        verification_token: null,
        token_expires_at: null,
      },
    });
  });

  it('rejects a wrong token when lookup misses', async () => {
    configObjectsService.findSorBoundInstanceByMetaField.mockResolvedValue(null);

    const result = await service.executeTrigger({
      trigger: CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
      objectType: 'customer',
      input: { token: 'wrong-token' },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid or expired');
    expect(configObjectsService.applySorBoundInstancePatch).not.toHaveBeenCalled();
  });

  it('rejects an expired token when rule when-clause fails', async () => {
    configObjectsService.findSorBoundInstanceByMetaField.mockResolvedValue({
      coreId: 42,
      metaJson: {
        verification_token: 'tok-expired',
        token_expires_at: '2020-01-01T00:00:00.000Z',
        email_verified: false,
      },
    });
    configObjectsService.resolveObjectInstance.mockResolvedValue({
      dynamicFields: {
        verification_token: 'tok-expired',
        token_expires_at: '2020-01-01T00:00:00.000Z',
        email_verified: false,
      },
    });

    const result = await service.executeTrigger({
      trigger: CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
      objectType: 'customer',
      input: { token: 'tok-expired' },
    });

    expect(result.success).toBe(false);
    expect(result.coreId).toBe(42);
    expect(configObjectsService.applySorBoundInstancePatch).not.toHaveBeenCalled();
  });

  it('rejects when email is already verified', async () => {
    configObjectsService.findSorBoundInstanceByMetaField.mockResolvedValue({
      coreId: 42,
      metaJson: {
        verification_token: 'tok-reused',
        token_expires_at: '2099-01-01T00:00:00.000Z',
        email_verified: true,
      },
    });
    configObjectsService.resolveObjectInstance.mockResolvedValue({
      dynamicFields: {
        verification_token: 'tok-reused',
        token_expires_at: '2099-01-01T00:00:00.000Z',
        email_verified: true,
      },
    });

    const result = await service.executeTrigger({
      trigger: CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
      objectType: 'customer',
      input: { token: 'tok-reused' },
    });

    expect(result.success).toBe(false);
    expect(configObjectsService.applySorBoundInstancePatch).not.toHaveBeenCalled();
  });

  it('uses persisted verification rule when configured', async () => {
    verificationRuleRepo.findOne.mockResolvedValue({
      whenJson: {
        '==': [{ var: 'input.token' }, { var: 'record.verification_token' }],
      },
      thenJson: {
        set: { email_verified: true },
      },
    });
    configObjectsService.findSorBoundInstanceByMetaField.mockResolvedValue({
      coreId: 7,
      metaJson: { verification_token: 'tok-7', email_verified: false },
    });
    configObjectsService.resolveObjectInstance.mockResolvedValue({
      dynamicFields: { verification_token: 'tok-7', email_verified: false },
    });
    configObjectsService.applySorBoundInstancePatch.mockResolvedValue({
      core: { customerId: 7 },
      metaJson: { email_verified: true },
    });

    const result = await service.executeTrigger({
      trigger: CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
      objectType: 'customer',
      input: { token: 'tok-7' },
    });

    expect(result.success).toBe(true);
    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith(
      expect.objectContaining({
        metaPatch: { email_verified: true },
      }),
    );
  });

  it('verifies system_table user via SystemTableVerificationService', async () => {
    const userSchema = {
      configObject: {
        configObjectId: 200,
        bindingMode: 'system_table',
        objectType: 'user',
        verificationFieldMap: {
          tokenField: 'activationKey',
          expiresAtField: 'token_expires_at',
          verifiedField: 'email_verified',
          defaultTtlHours: 24,
        },
      },
      fields: [],
    };
    configObjectsService.getObjectSchema.mockResolvedValue(userSchema);
    systemTableVerificationService.findByTokenField.mockResolvedValue({
      coreId: 9,
      record: {
        activationKey: 'tok-user',
        token_expires_at: '2099-01-01T00:00:00.000Z',
        email_verified: false,
      },
    });
    systemTableVerificationService.applyVerificationPatch.mockResolvedValue({
      record: { email_verified: true },
      changedFields: ['activationKey', 'token_expires_at', 'email_verified', 'status'],
    });

    const result = await service.verifyConfigObjectEmail({
      objectType: 'tenant_user',
      token: 'tok-user',
    });

    expect(result.success).toBe(true);
    expect(result.coreId).toBe(9);
    expect(systemTableVerificationService.findByTokenField).toHaveBeenCalledWith(
      'user',
      'activationKey',
      'tok-user',
      expect.objectContaining({ tokenField: 'activationKey' }),
    );
    expect(
      configObjectsService.applySorBoundInstancePatch,
    ).not.toHaveBeenCalled();
  });

  it('returns rateLimited when verify RPC exceeds throttle', async () => {
    rateLimitService.checkAndRecord.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 30,
    });

    const result = await service.verifyConfigObjectEmail({
      objectType: 'customer',
      token: 'tok',
      clientKey: '1.2.3.4',
    });

    expect(result.success).toBe(false);
    expect(result.rateLimited).toBe(true);
    expect(result.retryAfterSeconds).toBe(30);
    expect(verificationAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'rate_limited' }),
    );
    expect(configObjectsService.findSorBoundInstanceByMetaField).not.toHaveBeenCalled();
  });
});
