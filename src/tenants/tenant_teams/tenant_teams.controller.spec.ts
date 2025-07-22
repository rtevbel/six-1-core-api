import { Test, TestingModule } from '@nestjs/testing';
import { TenantTeamsController } from './tenant_teams.controller';
import { TenantTeamsService } from './tenant_teams.service';

describe('TenantTeamsController', () => {
  let controller: TenantTeamsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantTeamsController],
      providers: [TenantTeamsService],
    }).compile();

    controller = module.get<TenantTeamsController>(TenantTeamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
