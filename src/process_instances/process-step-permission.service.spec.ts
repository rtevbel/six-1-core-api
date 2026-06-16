import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessStepPermissionService } from './process-step-permission.service';
import { ProcessInstanceStepEntity } from './process_instance_steps/entities/process_instance_step.entity';
import { AuthorizationService } from '../authorization/authorization.service';
import { PROCESS_STEP_PERMISSIONS_NOT_MET_MESSAGE } from '../common/constants';

describe('ProcessStepPermissionService', () => {
  let service: ProcessStepPermissionService;
  const stepRepo = { findOne: jest.fn() };
  const authorizationService = { hasPermissions: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepPermissionService,
        {
          provide: getRepositoryToken(ProcessInstanceStepEntity),
          useValue: stepRepo,
        },
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    service = module.get(ProcessStepPermissionService);
  });

  it('allows completion when no permissions are configured', async () => {
    stepRepo.findOne.mockResolvedValue({
      stepInstanceId: 10,
      requiredPermissions: null,
    });

    await expect(
      service.assertCallerCanCompleteStep(7, 10),
    ).resolves.toBeUndefined();
    expect(authorizationService.hasPermissions).not.toHaveBeenCalled();
  });

  it('rejects completion when caller lacks required permissions', async () => {
    stepRepo.findOne.mockResolvedValue({
      stepInstanceId: 10,
      requiredPermissions: ['process_templates.manage'],
    });
    authorizationService.hasPermissions.mockResolvedValue(false);

    await expect(
      service.assertCallerCanCompleteStep(7, 10),
    ).rejects.toThrow(PROCESS_STEP_PERMISSIONS_NOT_MET_MESSAGE);
  });

  it('allows completion when caller has required permissions', async () => {
    stepRepo.findOne.mockResolvedValue({
      stepInstanceId: 10,
      requiredPermissions: ['process_templates.manage'],
    });
    authorizationService.hasPermissions.mockResolvedValue(true);

    await expect(
      service.assertCallerCanCompleteStep(7, 10, 7),
    ).resolves.toBeUndefined();

    expect(authorizationService.hasPermissions).toHaveBeenCalledWith(
      7,
      ['process_templates.manage'],
      7,
    );
  });

  it('throws RpcException on assert failure', async () => {
    authorizationService.hasPermissions.mockResolvedValue(false);
    stepRepo.findOne.mockResolvedValue({
      stepInstanceId: 10,
      requiredPermissions: ['projects.manage'],
    });

    await expect(
      service.assertCallerCanCompleteStep(7, 10),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
