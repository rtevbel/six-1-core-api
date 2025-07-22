import { Test, TestingModule } from '@nestjs/testing';
import { TenantSubscriptionsController } from './tenant_subscriptions.controller';
import { TenantSubscriptionsService } from './tenant_subscriptions.service';

describe('TenantSubscriptionsController', () => {
  let controller: TenantSubscriptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantSubscriptionsController],
      providers: [TenantSubscriptionsService],
    }).compile();

    controller = module.get<TenantSubscriptionsController>(
      TenantSubscriptionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
