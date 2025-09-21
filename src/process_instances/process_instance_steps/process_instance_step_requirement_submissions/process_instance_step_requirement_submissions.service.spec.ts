import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepRequirementSubmissionsService } from './process_instance_step_requirement_submissions.service';

describe('ProcessInstanceStepRequirementSubmissionsService', () => {
  let service: ProcessInstanceStepRequirementSubmissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessInstanceStepRequirementSubmissionsService],
    }).compile();

    service = module.get<ProcessInstanceStepRequirementSubmissionsService>(
      ProcessInstanceStepRequirementSubmissionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
