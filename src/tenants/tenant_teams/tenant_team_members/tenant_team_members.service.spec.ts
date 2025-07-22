import { Test, TestingModule } from '@nestjs/testing';
import { TenantTeamMembersService } from './tenant_team_members.service';

describe('TenantTeamMembersService', () => {
  let service: TenantTeamMembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantTeamMembersService],
    }).compile();

    service = module.get<TenantTeamMembersService>(TenantTeamMembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
