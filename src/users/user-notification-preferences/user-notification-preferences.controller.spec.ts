import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

describe('UserNotificationPreferencesController', () => {
  let controller: UserNotificationPreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserNotificationPreferencesController],
      providers: [UserNotificationPreferencesService],
    }).compile();

    controller = module.get<UserNotificationPreferencesController>(
      UserNotificationPreferencesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
