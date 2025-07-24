import { Test, TestingModule } from '@nestjs/testing';
import { EventListenersController } from './event_listeners.controller';
import { EventListenersService } from './event_listeners.service';

describe('EventListenersController', () => {
  let controller: EventListenersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventListenersController],
      providers: [EventListenersService],
    }).compile();

    controller = module.get<EventListenersController>(EventListenersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
