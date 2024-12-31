import { Test, TestingModule } from '@nestjs/testing';
import { UserPasswordsService } from './user-passwords.service';

describe('UserPasswordsService', () => {
  let service: UserPasswordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPasswordsService],
    }).compile();

    service = module.get<UserPasswordsService>(UserPasswordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
