import { Test, TestingModule } from '@nestjs/testing';
import { TenantOffDaysController } from './tenant_off_days.controller';
import { TenantOffDaysService } from './tenant_off_days.service';

describe('TenantOffDaysController', () => {
  let controller: TenantOffDaysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantOffDaysController],
      providers: [TenantOffDaysService],
    }).compile();

    controller = module.get<TenantOffDaysController>(TenantOffDaysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
