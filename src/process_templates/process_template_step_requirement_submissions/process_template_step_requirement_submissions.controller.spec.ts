import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplateStepRequirementSubmissionsController } from './process_template_step_requirement_submissions.controller';
import { ProcessTemplateStepRequirementSubmissionsService } from './process_template_step_requirement_submissions.service';

describe('ProcessTemplateStepRequirementSubmissionsController', () => {
  let controller: ProcessTemplateStepRequirementSubmissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplateStepRequirementSubmissionsController],
      providers: [ProcessTemplateStepRequirementSubmissionsService],
    }).compile();

    controller = module.get<ProcessTemplateStepRequirementSubmissionsController>(ProcessTemplateStepRequirementSubmissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
