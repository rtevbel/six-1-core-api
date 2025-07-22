import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserOffDaysController } from './tenant_user_off_days.controller';
import { TenantUserOffDaysService } from './tenant_user_off_days.service';

describe('TenantUserOffDaysController', () => {
  let controller: TenantUserOffDaysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantUserOffDaysController],
      providers: [TenantUserOffDaysService],
    }).compile();

    controller = module.get<TenantUserOffDaysController>(
      TenantUserOffDaysController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
