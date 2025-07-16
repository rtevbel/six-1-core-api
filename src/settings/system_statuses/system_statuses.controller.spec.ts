import { Test, TestingModule } from '@nestjs/testing';
import { SystemStatusesController } from './system_statuses.controller';

describe('SystemStatusesController', () => {
  let controller: SystemStatusesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemStatusesController],
    }).compile();

    controller = module.get<SystemStatusesController>(SystemStatusesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
