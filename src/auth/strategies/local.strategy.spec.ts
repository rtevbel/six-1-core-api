import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  it('passes password first and username second to auth service', async () => {
    const validateUser = jest.fn().mockResolvedValue({ userId: 1 });
    const strategy = new LocalStrategy({
      validateUser,
    } as any);

    await expect(strategy.validate('alice', 'secret')).resolves.toEqual({
      userId: 1,
    });
    expect(validateUser).toHaveBeenCalledWith('secret', 'alice');
  });

  it('throws unauthorized when auth service returns null', async () => {
    const strategy = new LocalStrategy({
      validateUser: jest.fn().mockResolvedValue(null),
    } as any);

    await expect(strategy.validate('alice', 'secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
