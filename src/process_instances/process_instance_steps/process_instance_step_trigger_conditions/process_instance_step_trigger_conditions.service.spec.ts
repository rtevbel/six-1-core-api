import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepTriggersService } from './process_instance_step_trigger_conditions.service';

describe('ProcessInstanceStepTriggerConditionsService', () => {
  let service: ProcessInstanceStepTriggersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessInstanceStepTriggersService],
    }).compile();

    service = module.get<ProcessInstanceStepTriggersService>(
      ProcessInstanceStepTriggersService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
