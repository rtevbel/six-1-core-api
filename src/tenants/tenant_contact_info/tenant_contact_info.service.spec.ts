import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContactInfoService } from './tenant_contact_info.service';
import { TenantContactInfoEntity } from './entities/tenant_contact_info.entity';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';

describe('TenantContactInfoService', () => {
  let service: TenantContactInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContactInfoService,
        {
          provide: getRepositoryToken(TenantContactInfoEntity),
          useValue: {},
        },
        {
          provide: ConfigObjectsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TenantContactInfoService>(TenantContactInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
