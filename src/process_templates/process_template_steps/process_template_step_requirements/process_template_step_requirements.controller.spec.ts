import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepRequirementsController } from './process_template_step_requirements.controller';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';

describe('ProcessTemplateStepRequirementsController', () => {
  let controller: ProcessTemplateStepRequirementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplateStepRequirementsController],
      providers: [ProcessTemplateStepRequirementsService],
    }).compile();

    controller = module.get<ProcessTemplateStepRequirementsController>(
      ProcessTemplateStepRequirementsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
