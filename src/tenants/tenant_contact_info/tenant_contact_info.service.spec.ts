import { Test, TestingModule } from '@nestjs/testing';
import { TenantContactInfoService } from './tenant_contact_info.service';

describe('TenantContactInfoService', () => {
  let service: TenantContactInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantContactInfoService],
    }).compile();

    service = module.get<TenantContactInfoService>(TenantContactInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
