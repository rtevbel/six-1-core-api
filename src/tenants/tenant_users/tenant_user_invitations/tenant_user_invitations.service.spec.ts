import { Test, TestingModule } from '@nestjs/testing';
import { TenantUserInvitationsService } from './tenant_user_invitations.service';

describe('TenantUserInvitationsService', () => {
  let service: TenantUserInvitationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantUserInvitationsService],
    }).compile();

    service = module.get<TenantUserInvitationsService>(
      TenantUserInvitationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
