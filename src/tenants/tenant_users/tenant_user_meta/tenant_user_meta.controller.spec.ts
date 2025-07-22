import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserMetaController } from './tenant_user_meta.controller';
import { TenantUserMetaService } from './tenant_user_meta.service';

describe('TenantUserMetaController', () => {
  let controller: TenantUserMetaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantUserMetaController],
      providers: [TenantUserMetaService],
    }).compile();

    controller = module.get<TenantUserMetaController>(TenantUserMetaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
