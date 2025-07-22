import { Test, TestingModule } from '@nestjs/testing';
import { TenantTeamProjectsService } from './tenant_team_projects.service';

describe('TenantTeamProjectsService', () => {
  let service: TenantTeamProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantTeamProjectsService],
    }).compile();

    service = module.get<TenantTeamProjectsService>(TenantTeamProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
