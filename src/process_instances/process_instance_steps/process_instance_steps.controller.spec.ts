import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepsController } from './process_instance_steps.controller';
import { ProcessInstanceStepsService } from './process_instance_steps.service';

describe('ProcessTemplateStepsController', () => {
  let controller: ProcessInstanceStepsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstanceStepsController],
      providers: [ProcessInstanceStepsService],
    }).compile();

    controller = module.get<ProcessInstanceStepsController>(
      ProcessInstanceStepsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
