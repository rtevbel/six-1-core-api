import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserConfigurationsService } from './tenant_user_configurations.service';

describe('TenantUserConfigurationsService', () => {
  let service: TenantUserConfigurationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantUserConfigurationsService],
    }).compile();

    service = module.get<TenantUserConfigurationsService>(
      TenantUserConfigurationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
