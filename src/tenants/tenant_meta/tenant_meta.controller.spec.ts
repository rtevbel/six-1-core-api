import { Test, TestingModule } from '@nestjs/testing';
import { TenantMetaController } from './tenant_meta.controller';
import { TenantMetaService } from './tenant_meta.service';

describe('TenantMetaController', () => {
  let controller: TenantMetaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantMetaController],
      providers: [TenantMetaService],
    }).compile();

    controller = module.get<TenantMetaController>(TenantMetaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
