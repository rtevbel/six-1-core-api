import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepAssigneesService } from './process_template_step_assignees.service';
import { ProcessFeatureFlagsService } from '../../../automation/config/process-feature-flags.service';
import { PROCESS_TEMPLATE_STEP_ASSIGNEE_WRITE_BLOCKED_MESSAGE } from '../../../automation/process-step-assignee-spec.constants';

describe('ProcessTemplateStepAssigneesService', () => {
  const assigneeRepository = {
    save: jest.fn(),
    create: jest.fn((row) => row),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const stepRepository = {
    findOne: jest.fn(),
  };
  const processFlags = {
    isStepAssigneeSpecEnabled: jest.fn(),
  };

  const service = new ProcessTemplateStepAssigneesService(
    assigneeRepository as never,
    stepRepository as never,
    processFlags as unknown as ProcessFeatureFlagsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks create when assignee spec flag is enabled', async () => {
    processFlags.isStepAssigneeSpecEnabled.mockReturnValue(true);

    await expect(
      service.create(1, {
        processTemplateStepId: 1,
        tenantUserId: 2,
        createdBy: 1,
      }),
    ).rejects.toThrow(
      new RpcException(PROCESS_TEMPLATE_STEP_ASSIGNEE_WRITE_BLOCKED_MESSAGE),
    );
  });

  it('returns deprecation metadata on findAll', async () => {
    processFlags.isStepAssigneeSpecEnabled.mockReturnValue(false);
    stepRepository.findOne.mockResolvedValue({
      processTemplateStepId: 1,
      processTemplate: { tenantId: 1 },
    });
    assigneeRepository.findAndCount.mockResolvedValue([
      [{ stepAssigneeId: 1 }],
      1,
    ]);

    const result = await service.findAll(1, {
      processTemplateStepId: 1,
      tenantId: 1,
    });

    expect(result.deprecated).toBe(true);
    expect(result.deprecationMessage).toContain('assigneeSpec');
  });
});
