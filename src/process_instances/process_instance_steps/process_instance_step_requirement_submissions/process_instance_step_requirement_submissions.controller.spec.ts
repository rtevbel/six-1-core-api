import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepRequirementSubmissionsController } from './process_instance_step_requirement_submissions.controller';
import { ProcessInstanceStepRequirementSubmissionsService } from './process_instance_step_requirement_submissions.service';

describe('ProcessInstanceStepRequirementSubmissionsController', () => {
  let controller: ProcessInstanceStepRequirementSubmissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstanceStepRequirementSubmissionsController],
      providers: [ProcessInstanceStepRequirementSubmissionsService],
    }).compile();

    controller =
      module.get<ProcessInstanceStepRequirementSubmissionsController>(
        ProcessInstanceStepRequirementSubmissionsController,
      );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
