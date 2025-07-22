import { Test, TestingModule } from '@nestjs/testing';
import { TenantTeamsService } from './tenant_teams.service';

describe('TenantTeamsService', () => {
  let service: TenantTeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantTeamsService],
    }).compile();

    service = module.get<TenantTeamsService>(TenantTeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
