import { Test, TestingModule } from '@nestjs/testing';
import { TenantBillingInfoService } from './tenant_billing_info.service';

describe('TenantBillingInfoService', () => {
  let service: TenantBillingInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantBillingInfoService],
    }).compile();

    service = module.get<TenantBillingInfoService>(TenantBillingInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
