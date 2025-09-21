import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepTriggersController } from './process_instance_step_trigger_conditions.controller';
import { ProcessInstanceStepTriggersService } from './process_instance_step_trigger_conditions.service';

describe('ProcessInstanceStepTriggerConditionsController', () => {
  let controller: ProcessInstanceStepTriggersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstanceStepTriggersController],
      providers: [ProcessInstanceStepTriggersService],
    }).compile();

    controller = module.get<ProcessInstanceStepTriggersController>(
      ProcessInstanceStepTriggersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
