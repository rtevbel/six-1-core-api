import { Test, TestingModule } from '@nestjs/testing';
import { TenantConfigurationsService } from './tenant_configurations.service';

describe('TenantConfigurationsService', () => {
  let service: TenantConfigurationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantConfigurationsService],
    }).compile();

    service = module.get<TenantConfigurationsService>(
      TenantConfigurationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
