import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserInvitationsController } from './tenant_user_invitations.controller';
import { TenantUserInvitationsService } from './tenant_user_invitations.service';

describe('TenantUserInvitationsController', () => {
  let controller: TenantUserInvitationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantUserInvitationsController],
      providers: [TenantUserInvitationsService],
    }).compile();

    controller = module.get<TenantUserInvitationsController>(
      TenantUserInvitationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
