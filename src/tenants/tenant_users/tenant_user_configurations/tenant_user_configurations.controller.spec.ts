import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserConfigurationsController } from './tenant_user_configurations.controller';
import { TenantUserConfigurationsService } from './tenant_user_configurations.service';

describe('TenantUserConfigurationsController', () => {
  let controller: TenantUserConfigurationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantUserConfigurationsController],
      providers: [TenantUserConfigurationsService],
    }).compile();

    controller = module.get<TenantUserConfigurationsController>(
      TenantUserConfigurationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
