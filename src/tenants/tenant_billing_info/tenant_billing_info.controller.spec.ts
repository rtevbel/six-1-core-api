import { Test, TestingModule } from '@nestjs/testing';
import { TenantBillingInfoController } from './tenant_billing_info.controller';
import { TenantBillingInfoService } from './tenant_billing_info.service';

describe('TenantBillingInfoController', () => {
  let controller: TenantBillingInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantBillingInfoController],
      providers: [TenantBillingInfoService],
    }).compile();

    controller = module.get<TenantBillingInfoController>(
      TenantBillingInfoController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
