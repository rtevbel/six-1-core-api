import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstancesController } from './process_instances.controller';
import { ProcessInstancesService } from './process_instances.service';

describe('ProcessInstancesController', () => {
  let controller: ProcessInstancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstancesController],
      providers: [ProcessInstancesService],
    }).compile();

    controller = module.get<ProcessInstancesController>(
      ProcessInstancesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
