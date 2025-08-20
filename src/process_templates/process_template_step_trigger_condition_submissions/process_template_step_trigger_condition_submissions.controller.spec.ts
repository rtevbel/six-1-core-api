import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepTriggerConditionSubmissionsController } from './process_template_step_trigger_condition_submissions.controller';
import { ProcessTemplateStepTriggerConditionSubmissionsService } from './process_template_step_trigger_condition_submissions.service';

describe('ProcessTemplateStepTriggerConditionSubmissionsController', () => {
  let controller: ProcessTemplateStepTriggerConditionSubmissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplateStepTriggerConditionSubmissionsController],
      providers: [ProcessTemplateStepTriggerConditionSubmissionsService],
    }).compile();

    controller = module.get<ProcessTemplateStepTriggerConditionSubmissionsController>(ProcessTemplateStepTriggerConditionSubmissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
