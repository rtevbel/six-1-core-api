import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantSubscriptionService } from './tenant_subscriptions.service';
import { TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';

describe('TenantSubscriptionService', () => {
  let service: TenantSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantSubscriptionService,
        {
          provide: getRepositoryToken(TenantSubscriptionEntity),
          useValue: {},
        },
        {
          provide: ConfigObjectsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TenantSubscriptionService>(TenantSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
