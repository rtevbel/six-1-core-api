import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepsService } from './process_template_steps.service';

describe('ProcessTemplateStepsService', () => {
  let service: ProcessTemplateStepsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessTemplateStepsService],
    }).compile();

    service = module.get<ProcessTemplateStepsService>(ProcessTemplateStepsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
