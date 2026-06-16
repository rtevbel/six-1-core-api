import { Test, TestingModule } from '@nestjs/testing';
import { EventLogsController } from './event_logs.controller';
import { EventLogsService } from './event_logs.service';
import { PlatformEventNotificationBridgeService } from '../platform-event-notification-bridge.service';
import { PlatformEventFlagsService } from '../config/platform-event-flags.service';

describe('EventLogsController', () => {
  let controller: EventLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventLogsController],
      providers: [
        { provide: EventLogsService, useValue: {} },
        {
          provide: PlatformEventNotificationBridgeService,
          useValue: { handle: jest.fn() },
        },
        {
          provide: PlatformEventFlagsService,
          useValue: { isEventBusEnabled: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile();

    controller = module.get(EventLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
