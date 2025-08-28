import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepTriggerConditionsController } from './process_template_step_trigger_conditions.controller';
import { ProcessTemplateStepTriggerConditionsService } from './process_template_step_trigger_conditions.service';

describe('ProcessTemplateStepTriggerConditionsController', () => {
  let controller: ProcessTemplateStepTriggerConditionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplateStepTriggerConditionsController],
      providers: [ProcessTemplateStepTriggerConditionsService],
    }).compile();

    controller = module.get<ProcessTemplateStepTriggerConditionsController>(
      ProcessTemplateStepTriggerConditionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
