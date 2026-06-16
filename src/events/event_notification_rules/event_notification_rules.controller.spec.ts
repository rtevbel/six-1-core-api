import { Test, TestingModule } from '@nestjs/testing';
import { EventNotificationRulesController } from './event_notification_rules.controller';
import { EventNotificationRulesService } from './event_notification_rules.service';

describe('EventNotificationRulesController', () => {
  let controller: EventNotificationRulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventNotificationRulesController],
      providers: [{ provide: EventNotificationRulesService, useValue: {} }],
    }).compile();

    controller = module.get(EventNotificationRulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
