import { Test, TestingModule } from '@nestjs/testing';
import { TenantWorkingHoursController } from './tenant_working_hours.controller';
import { TenantWorkingHoursService } from './tenant_working_hours.service';

describe('TenantWorkingHoursController', () => {
  let controller: TenantWorkingHoursController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantWorkingHoursController],
      providers: [TenantWorkingHoursService],
    }).compile();

    controller = module.get<TenantWorkingHoursController>(
      TenantWorkingHoursController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
