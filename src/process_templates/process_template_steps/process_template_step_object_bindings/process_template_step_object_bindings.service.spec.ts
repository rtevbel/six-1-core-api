import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepObjectBindingsService } from './process_template_step_object_bindings.service';
import { ProcessTemplateStepObjectBindingEntity } from './entities/process_template_step_object_binding.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import {
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER,
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
} from '../../../automation/process-step-object-binding.constants';

describe('ProcessTemplateStepObjectBindingsService', () => {
  let service: ProcessTemplateStepObjectBindingsService;

  const bindingRepository = {
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => ({ bindingId: 1, ...row })),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const stepRepository = {
    findOne: jest.fn(),
  };

  const configObjectRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessTemplateStepObjectBindingsService,
        {
          provide: getRepositoryToken(ProcessTemplateStepObjectBindingEntity),
          useValue: bindingRepository,
        },
        {
          provide: getRepositoryToken(ProcessTemplateStepEntity),
          useValue: stepRepository,
        },
        {
          provide: getRepositoryToken(ConfigObjectEntity),
          useValue: configObjectRepository,
        },
        {
          provide: ConfigObjectsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(ProcessTemplateStepObjectBindingsService);
  });

  function mockAllowedBinding() {
    stepRepository.findOne.mockResolvedValue({
      processTemplateStepId: 10,
      processTemplate: { tenantId: 1 },
    });
    configObjectRepository.findOne.mockResolvedValue({
      configObjectId: 20,
      bindingMode: 'standalone',
      templateSet: { tenantId: 1 },
    });
  }

  it('creates a binding when config object and step are valid', async () => {
    mockAllowedBinding();

    const result = await service.create(2, {
      processTemplateStepId: 10,
      configObjectId: 20,
      bindingMode: PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER,
      completionRule: { type: 'payload_valid' },
      createdBy: 2,
    });

    expect(result.bindingId).toBe(1);
    expect(bindingRepository.save).toHaveBeenCalled();
  });

  it('rejects system_table config objects', async () => {
    stepRepository.findOne.mockResolvedValue({
      processTemplateStepId: 10,
      processTemplate: { tenantId: 1 },
    });
    configObjectRepository.findOne.mockResolvedValue({
      configObjectId: 20,
      bindingMode: 'system_table',
      templateSet: { tenantId: 1 },
    });

    await expect(
      service.create(2, {
        processTemplateStepId: 10,
        configObjectId: 20,
        bindingMode: PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER,
        completionRule: { type: 'payload_valid' },
        createdBy: 2,
      }),
    ).rejects.toThrow(RpcException);
  });

  it('rejects use_existing binding mode in v1', async () => {
    mockAllowedBinding();

    await expect(
      service.create(2, {
        processTemplateStepId: 10,
        configObjectId: 20,
        bindingMode: PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
        completionRule: { type: 'payload_valid' },
        createdBy: 2,
      }),
    ).rejects.toThrow(/not supported in v1/);
  });
});
