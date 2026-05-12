import {
  assertPersistableConfigObjectFieldKey,
  normalizeConfigObjectFieldKey,
} from './normalize-config-object-field-key';
import { RpcException } from '@nestjs/microservices';

describe('normalizeConfigObjectFieldKey', () => {
  it('lowercases, trims, and replaces whitespace runs with a single underscore', () => {
    expect(normalizeConfigObjectFieldKey('  My Custom Field  ')).toBe(
      'my_custom_field',
    );
    expect(normalizeConfigObjectFieldKey('a\t\nb')).toBe('a_b');
    expect(normalizeConfigObjectFieldKey('already_good')).toBe('already_good');
  });
});

describe('assertPersistableConfigObjectFieldKey', () => {
  it('accepts valid lowercase identifiers', () => {
    expect(() =>
      assertPersistableConfigObjectFieldKey('customer_code'),
    ).not.toThrow();
  });

  it('rejects empty keys', () => {
    expect(() => assertPersistableConfigObjectFieldKey('')).toThrow(
      RpcException,
    );
  });

  it('rejects keys starting with a digit or underscore', () => {
    expect(() => assertPersistableConfigObjectFieldKey('1bad')).toThrow(
      RpcException,
    );
    expect(() => assertPersistableConfigObjectFieldKey('_bad')).toThrow(
      RpcException,
    );
  });

  it('rejects keys containing non-identifier characters (e.g. hyphens)', () => {
    expect(() => assertPersistableConfigObjectFieldKey('my-field')).toThrow(
      RpcException,
    );
  });
});
