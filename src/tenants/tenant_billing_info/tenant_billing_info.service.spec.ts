import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantBillingInfoService } from './tenant_billing_info.service';
import { TenantBillingInfoEntity } from './entities/tenant_billing_info.entity';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';

describe('TenantBillingInfoService', () => {
  let service: TenantBillingInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantBillingInfoService,
        {
          provide: getRepositoryToken(TenantBillingInfoEntity),
          useValue: {},
        },
        {
          provide: ConfigObjectsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TenantBillingInfoService>(TenantBillingInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
