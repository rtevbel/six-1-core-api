import { Test, TestingModule } from '@nestjs/testing';
import { TenantConfigurationsController } from './tenant_configurations.controller';
import { TenantConfigurationsService } from './tenant_configurations.service';

describe('TenantConfigurationsController', () => {
  let controller: TenantConfigurationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantConfigurationsController],
      providers: [TenantConfigurationsService],
    }).compile();

    controller = module.get<TenantConfigurationsController>(
      TenantConfigurationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
