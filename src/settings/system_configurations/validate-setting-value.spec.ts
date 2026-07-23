import { RpcException } from '@nestjs/microservices';
import { validateSettingValue } from './validate-setting-value';

describe('validateSettingValue', () => {
  it('validates string with pattern', () => {
    expect(
      validateSettingValue('string', '#1A73E8', {
        pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
      }),
    ).toBe('#1A73E8');
  });

  it('validates number min/max', () => {
    expect(validateSettingValue('number', 10, { min: 1, max: 100 })).toBe(10);
    expect(() => validateSettingValue('number', 0, { min: 1 })).toThrow(
      RpcException,
    );
  });

  it('validates boolean coercion', () => {
    expect(validateSettingValue('boolean', 'true')).toBe(true);
    expect(validateSettingValue('boolean', 0)).toBe(false);
  });

  it('validates enum against allowedValues', () => {
    expect(
      validateSettingValue('enum', 'a', { allowedValues: ['a', 'b'] }),
    ).toBe('a');
    expect(() =>
      validateSettingValue('enum', 'c', { allowedValues: ['a', 'b'] }),
    ).toThrow(RpcException);
  });

  it('validates email and url', () => {
    expect(validateSettingValue('email', 'a@b.com')).toBe('a@b.com');
    expect(() => validateSettingValue('email', 'not-an-email')).toThrow(
      RpcException,
    );
    expect(validateSettingValue('url', 'https://example.com')).toBe(
      'https://example.com',
    );
  });

  it('validates arrays', () => {
    expect(validateSettingValue('string_array', ['a', 'b'])).toEqual([
      'a',
      'b',
    ]);
    expect(validateSettingValue('number_array', [1, 2])).toEqual([1, 2]);
  });
});
