import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';
import { ProcessFeatureFlagsService } from '../../../automation/config/process-feature-flags.service';
import { PROCESS_STEP_REQUIREMENT_TYPE_NOT_ALLOWED_MESSAGE } from './process-step-requirement-policy.constants';

describe('ProcessTemplateStepRequirementsService', () => {
  const requirementRepository = {
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => ({ processTemplateStepRequirementId: 1, ...row })),
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const bindingRepository = {
    find: jest.fn().mockResolvedValue([]),
  };
  const configObjectRepository = {
    createQueryBuilder: jest.fn(),
  };
  const configObjectFieldRepository = {
    find: jest.fn().mockResolvedValue([]),
  };
  const configObjectsService = {} as never;
  const processFlags = {
    isStepRequirementGatePolicyEnabled: jest.fn(),
  };

  const service = new ProcessTemplateStepRequirementsService(
    requirementRepository as never,
    bindingRepository as never,
    configObjectRepository as never,
    configObjectFieldRepository as never,
    configObjectsService,
    processFlags as unknown as ProcessFeatureFlagsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    processFlags.isStepRequirementGatePolicyEnabled.mockReturnValue(false);
  });

  it('creates requirements when gate policy is disabled', async () => {
    await service.create(1, {
      processTemplateStepId: 10,
      requirementType: 'document',
      requirementKey: 'legacy_form',
      jsonSchema: { schema: { properties: { a: { type: 'string' } } } },
      createdBy: 1,
    });

    expect(requirementRepository.save).toHaveBeenCalled();
  });

  it('rejects disallowed types when gate policy is enabled', async () => {
    processFlags.isStepRequirementGatePolicyEnabled.mockReturnValue(true);

    await expect(
      service.create(1, {
        processTemplateStepId: 10,
        requirementType: 'document',
        requirementKey: 'legacy_form',
        jsonSchema: {},
        createdBy: 1,
      }),
    ).rejects.toThrow(
      new RpcException(PROCESS_STEP_REQUIREMENT_TYPE_NOT_ALLOWED_MESSAGE),
    );
  });
});
