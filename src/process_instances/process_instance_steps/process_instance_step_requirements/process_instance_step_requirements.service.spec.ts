import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepRequirementsService } from './process_instance_step_requirements.service';

describe('ProcessInstanceStepRequirementsService', () => {
  let service: ProcessInstanceStepRequirementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessInstanceStepRequirementsService],
    }).compile();

    service = module.get<ProcessInstanceStepRequirementsService>(
      ProcessInstanceStepRequirementsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
