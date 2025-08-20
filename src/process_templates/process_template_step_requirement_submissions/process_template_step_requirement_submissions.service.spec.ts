import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepRequirementSubmissionsService } from './process_template_step_requirement_submissions.service';

describe('ProcessTemplateStepRequirementSubmissionsService', () => {
  let service: ProcessTemplateStepRequirementSubmissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessTemplateStepRequirementSubmissionsService],
    }).compile();

    service = module.get<ProcessTemplateStepRequirementSubmissionsService>(ProcessTemplateStepRequirementSubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
