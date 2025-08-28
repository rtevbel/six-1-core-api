import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepTriggerConditionSubmissionsService } from './process_template_step_trigger_condition_submissions.service';

describe('ProcessTemplateStepTriggerConditionSubmissionsService', () => {
  let service: ProcessTemplateStepTriggerConditionSubmissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessTemplateStepTriggerConditionSubmissionsService],
    }).compile();

    service = module.get<ProcessTemplateStepTriggerConditionSubmissionsService>(
      ProcessTemplateStepTriggerConditionSubmissionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
