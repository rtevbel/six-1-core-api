import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserWorkingHoursController } from './tenant_user_working_hours.controller';
import { TenantUserWorkingHoursService } from './tenant_user_working_hours.service';

describe('TenantUserWorkingHoursController', () => {
  let controller: TenantUserWorkingHoursController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantUserWorkingHoursController],
      providers: [TenantUserWorkingHoursService],
    }).compile();

    controller = module.get<TenantUserWorkingHoursController>(
      TenantUserWorkingHoursController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
