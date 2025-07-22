import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserWorkingHoursService } from './tenant_user_working_hours.service';

describe('TenantUserWorkingHoursService', () => {
  let service: TenantUserWorkingHoursService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantUserWorkingHoursService],
    }).compile();

    service = module.get<TenantUserWorkingHoursService>(
      TenantUserWorkingHoursService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
