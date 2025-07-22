import { Test, TestingModule } from '@nestjs/testing';
import { TenantWorkingHoursService } from './tenant_working_hours.service';

describe('TenantWorkingHoursService', () => {
  let service: TenantWorkingHoursService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantWorkingHoursService],
    }).compile();

    service = module.get<TenantWorkingHoursService>(TenantWorkingHoursService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
