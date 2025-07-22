import { Test, TestingModule } from '@nestjs/testing';
import { TenantTeamProjectsController } from './tenant_team_projects.controller';
import { TenantTeamProjectsService } from './tenant_team_projects.service';

describe('TenantTeamProjectsController', () => {
  let controller: TenantTeamProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantTeamProjectsController],
      providers: [TenantTeamProjectsService],
    }).compile();

    controller = module.get<TenantTeamProjectsController>(
      TenantTeamProjectsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
