import { Test, TestingModule } from '@nestjs/testing';
import { TenantTeamMembersController } from './tenant_team_members.controller';
import { TenantTeamMembersService } from './tenant_team_members.service';

describe('TenantTeamMembersController', () => {
  let controller: TenantTeamMembersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantTeamMembersController],
      providers: [TenantTeamMembersService],
    }).compile();

    controller = module.get<TenantTeamMembersController>(
      TenantTeamMembersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
