import { Test, TestingModule } from '@nestjs/testing';
import { TenantMetaService } from './tenant_meta.service';

describe('TenantMetaService', () => {
  let service: TenantMetaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantMetaService],
    }).compile();

    service = module.get<TenantMetaService>(TenantMetaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
