import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepTriggerConditionsService } from './process_template_step_trigger_conditions.service';

describe('ProcessTemplateStepTriggerConditionsService', () => {
  let service: ProcessTemplateStepTriggerConditionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessTemplateStepTriggerConditionsService],
    }).compile();

    service = module.get<ProcessTemplateStepTriggerConditionsService>(
      ProcessTemplateStepTriggerConditionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
