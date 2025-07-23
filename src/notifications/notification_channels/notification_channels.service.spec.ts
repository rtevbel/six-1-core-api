import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannelsService } from './notification_channels.service';

describe('NotificationChannelsService', () => {
  let service: NotificationChannelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationChannelsService],
    }).compile();

    service = module.get<NotificationChannelsService>(NotificationChannelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
