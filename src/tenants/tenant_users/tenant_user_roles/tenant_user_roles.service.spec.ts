import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserRolesService } from './tenant_user_roles.service';

describe('TenantUserRolesService', () => {
  let service: TenantUserRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantUserRolesService],
    }).compile();

    service = module.get<TenantUserRolesService>(TenantUserRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
