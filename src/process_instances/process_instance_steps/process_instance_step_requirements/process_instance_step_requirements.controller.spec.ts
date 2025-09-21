import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepRequirementsController } from './process_instance_step_requirements.controller';
import { ProcessInstanceStepRequirementsService } from './process_instance_step_requirements.service';

describe('ProcessInstanceStepRequirementsController', () => {
  let controller: ProcessInstanceStepRequirementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstanceStepRequirementsController],
      providers: [ProcessInstanceStepRequirementsService],
    }).compile();

    controller = module.get<ProcessInstanceStepRequirementsController>(
      ProcessInstanceStepRequirementsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
