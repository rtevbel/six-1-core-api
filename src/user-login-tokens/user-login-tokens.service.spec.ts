import { Test, TestingModule } from '@nestjs/testing';
import { UserLoginTokensService } from './user-login-tokens.service';

describe('UserLoginTokensService', () => {
  let service: UserLoginTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserLoginTokensService],
    }).compile();

    service = module.get<UserLoginTokensService>(UserLoginTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
