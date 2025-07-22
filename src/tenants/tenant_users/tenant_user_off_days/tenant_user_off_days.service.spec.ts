import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserOffDaysService } from './tenant_user_off_days.service';

describe('TenantUserOffDaysService', () => {
  let service: TenantUserOffDaysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantUserOffDaysService],
    }).compile();

    service = module.get<TenantUserOffDaysService>(TenantUserOffDaysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
