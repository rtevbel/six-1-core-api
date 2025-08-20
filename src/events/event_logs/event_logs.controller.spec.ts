import { Test, TestingModule } from '@nestjs/testing';
import { EventLogsController } from './event_logs.controller';
import { EventLogsService } from './event_logs.service';

describe('EventLogsController', () => {
  let controller: EventLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventLogsController],
      providers: [EventLogsService],
    }).compile();

    controller = module.get<EventLogsController>(EventLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
