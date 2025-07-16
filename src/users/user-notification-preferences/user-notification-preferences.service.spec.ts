import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

describe('UserNotificationPreferencesService', () => {
  let service: UserNotificationPreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserNotificationPreferencesService],
    }).compile();

    service = module.get<UserNotificationPreferencesService>(
      UserNotificationPreferencesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
