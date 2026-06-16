import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProcessStepAssigneeService } from './process-step-assignee.service';
import { ProcessInstanceStepAssigneeEntity } from '../process_instances/process_instance_steps/entities/process_instance_step_assignee.entity';

describe('ProcessStepAssigneeService', () => {
  let service: ProcessStepAssigneeService;
  const find = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepAssigneeService,
        {
          provide: getRepositoryToken(ProcessInstanceStepAssigneeEntity),
          useValue: {
            find,
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
      ],
    }).compile();

    service = module.get(ProcessStepAssigneeService);
  });

  it('resolves primary assignee from ordered rows', async () => {
    find.mockResolvedValueOnce([
      { tenantUserId: 42, assignmentOrder: 0 },
      { tenantUserId: 43, assignmentOrder: 1 },
    ]);

    const result = await service.resolveForStep(101);

    expect(result).toEqual({
      assigneeIds: [42, 43],
      primaryAssigneeId: 42,
    });
  });
});
