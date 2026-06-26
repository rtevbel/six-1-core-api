import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { NOTIFICATION_PUBLIC_BASE_URL_KEY } from '../common/constants';
import { ProcessStepGenerateVerificationTokenService } from './process-step-generate-verification-token.service';
import * as tokenUtil from '../config_objects/verification/generate-verification-token.util';

describe('ProcessStepGenerateVerificationTokenService', () => {
  let service: ProcessStepGenerateVerificationTokenService;
  let configObjectsService: {
    getObjectSchema: jest.Mock;
    applySorBoundInstancePatch: jest.Mock;
  };

  const envelopeParams = {
    tenantId: 5,
    processInstanceId: 100,
    processTemplateId: 10,
    subjectType: 'customer',
    subjectId: 42,
    subjectMetadata: null,
    processContext: { customerId: 42 },
    stepInstanceId: 200,
    stepName: 'Collect details',
    stepOrder: 1,
    stepStatus: 'completed',
    runOn: 'step_completed' as const,
    correlationId: 'corr-1',
    actorUserId: 9,
  };

  beforeEach(async () => {
    configObjectsService = {
      getObjectSchema: jest.fn().mockResolvedValue({
        configObject: {
          bindingMode: 'sor_bound',
          verificationFieldMap: {
            tokenField: 'verification_token',
            expiresAtField: 'token_expires_at',
            verifiedField: 'email_verified',
            defaultTtlHours: 24,
          },
        },
      }),
      applySorBoundInstancePatch: jest.fn().mockResolvedValue({
        core: { customerId: 42 },
        metaJson: {
          verification_token: 'fixed-token',
          token_expires_at: '2026-06-27T12:00:00.000Z',
          email_verified: false,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepGenerateVerificationTokenService,
        {
          provide: ConfigObjectsService,
          useValue: configObjectsService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === NOTIFICATION_PUBLIC_BASE_URL_KEY
                ? 'https://app.example.com'
                : null,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(ProcessStepGenerateVerificationTokenService);
    jest
      .spyOn(tokenUtil, 'generateVerificationToken')
      .mockReturnValue('fixed-token');
    jest.useFakeTimers().setSystemTime(new Date('2026-06-26T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('writes verification meta fields and returns token metadata', async () => {
    const result = await service.execute(
      {
        objectType: 'customer',
        coreIdPath: 'context.customerId',
      },
      envelopeParams,
    );

    expect(configObjectsService.applySorBoundInstancePatch).toHaveBeenCalledWith({
      tenantId: 5,
      objectType: 'customer',
      coreId: 42,
      metaPatch: {
        verification_token: 'fixed-token',
        token_expires_at: '2026-06-27T12:00:00.000Z',
        email_verified: false,
      },
      customerId: undefined,
    });
    expect(result).toMatchObject({
      objectType: 'customer',
      coreId: 42,
      token: 'fixed-token',
      expiresAt: '2026-06-27T12:00:00.000Z',
      verifyUrl: 'https://app.example.com/verify-customer?token=fixed-token',
      metaJson: expect.objectContaining({
        verification_token: 'fixed-token',
      }),
    });
  });

  it('fails when coreIdPath does not resolve', async () => {
    await expect(
      service.execute(
        {
          objectType: 'customer',
          coreIdPath: 'context.missing',
        },
        { ...envelopeParams, processContext: {} },
      ),
    ).rejects.toThrow('coreIdPath');
  });
});
