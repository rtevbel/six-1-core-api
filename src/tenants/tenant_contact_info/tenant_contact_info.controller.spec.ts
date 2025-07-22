import { Test, TestingModule } from '@nestjs/testing';
import { TenantContactInfoController } from './tenant_contact_info.controller';
import { TenantContactInfoService } from './tenant_contact_info.service';

describe('TenantContactInfoController', () => {
  let controller: TenantContactInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantContactInfoController],
      providers: [TenantContactInfoService],
    }).compile();

    controller = module.get<TenantContactInfoController>(
      TenantContactInfoController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
