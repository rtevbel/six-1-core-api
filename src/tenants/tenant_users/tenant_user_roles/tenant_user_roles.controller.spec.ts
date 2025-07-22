import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserRolesController } from './tenant_user_roles.controller';
import { TenantUserRolesService } from './tenant_user_roles.service';

describe('TenantUserRolesController', () => {
  let controller: TenantUserRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantUserRolesController],
      providers: [TenantUserRolesService],
    }).compile();

    controller = module.get<TenantUserRolesController>(
      TenantUserRolesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
