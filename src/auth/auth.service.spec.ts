import { AuthService } from './auth.service';
import { RpcException } from '@nestjs/microservices';
import { UserEntity } from '../users/entities/user.entity';
import * as commonFunctions from '../common/functions';
import { NO_RECORD_FOUND_MESSAGE } from '../common/constants';

describe('AuthService', () => {
  let service: AuthService;
  let userService: { findOneBy: jest.Mock };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    userService = {
      findOneBy: jest.fn(),
    };

    service = new AuthService(
      userService as any,
      {} as any,
      {} as any,
      { get: jest.fn() } as any,
      { set: jest.fn(), get: jest.fn(), del: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the user without the password when credentials match', async () => {
    const user = {
      userId: 7,
      username: 'alice',
      email: 'alice@example.com',
      password: 'hashed-password',
      status: 1,
    } as UserEntity;

    userService.findOneBy.mockResolvedValue(user);
    jest
      .spyOn(commonFunctions, 'compare_hashed_content')
      .mockResolvedValueOnce(true);

    await expect(
      service.validateUser('plain-password', 'alice'),
    ).resolves.toEqual({
      userId: 7,
      username: 'alice',
      email: 'alice@example.com',
      status: 1,
    });
    expect(commonFunctions.compare_hashed_content).toHaveBeenCalledWith(
      'hashed-password',
      'plain-password',
    );
  });

  it('returns null when credentials do not match', async () => {
    userService.findOneBy.mockResolvedValue({
      password: 'hashed-password',
      status: 1,
    } as UserEntity);
    jest
      .spyOn(commonFunctions, 'compare_hashed_content')
      .mockResolvedValueOnce(false);

    await expect(
      service.validateUser('wrong-password', 'alice'),
    ).resolves.toBeNull();
  });

  it('returns null when the user record does not exist', async () => {
    userService.findOneBy.mockRejectedValue(
      new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserEntity.name),
      ),
    );

    await expect(
      service.validateUser('plain-password', 'missing-user'),
    ).resolves.toBeNull();
  });
});
