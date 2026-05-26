import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstancesController } from './process_instances.controller';
import { ProcessInstancesService } from './process_instances.service';
import { ProcessRunnerService } from './process-runner.service';

describe('ProcessInstancesController', () => {
  let controller: ProcessInstancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstancesController],
      providers: [
        { provide: ProcessInstancesService, useValue: {} },
        { provide: ProcessRunnerService, useValue: { buildPayload: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ProcessInstancesController>(
      ProcessInstancesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
