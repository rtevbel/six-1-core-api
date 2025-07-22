import { Test, TestingModule } from '@nestjs/testing';
import { TenantSubscriptionsService } from './tenant_subscriptions.service';

describe('TenantSubscriptionsService', () => {
  let service: TenantSubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantSubscriptionsService],
    }).compile();

    service = module.get<TenantSubscriptionsService>(
      TenantSubscriptionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
