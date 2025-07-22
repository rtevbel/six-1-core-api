import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserMetaService } from './tenant_user_meta.service';

describe('TenantUserMetaService', () => {
  let service: TenantUserMetaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantUserMetaService],
    }).compile();

    service = module.get<TenantUserMetaService>(TenantUserMetaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
