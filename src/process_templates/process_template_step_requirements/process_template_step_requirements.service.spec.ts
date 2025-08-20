import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';

describe('ProcessTemplateStepRequirementsService', () => {
  let service: ProcessTemplateStepRequirementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessTemplateStepRequirementsService],
    }).compile();

    service = module.get<ProcessTemplateStepRequirementsService>(ProcessTemplateStepRequirementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
