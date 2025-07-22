import { Test, TestingModule } from '@nestjs/testing';
import { TenantOffDaysService } from './tenant_off_days.service';

describe('TenantOffDaysService', () => {
  let service: TenantOffDaysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantOffDaysService],
    }).compile();

    service = module.get<TenantOffDaysService>(TenantOffDaysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
