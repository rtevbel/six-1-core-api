import { resolveJwtExpiresIn } from './jwt-expiration';

describe('resolveJwtExpiresIn', () => {
  it('returns fallback when unset', () => {
    expect(resolveJwtExpiresIn(undefined)).toBe('1d');
    expect(resolveJwtExpiresIn('')).toBe('1d');
  });

  it('parses plain integer strings as seconds', () => {
    expect(resolveJwtExpiresIn('86400')).toBe(86400);
  });

  it('passes duration strings through without parseInt truncation', () => {
    expect(resolveJwtExpiresIn('1d')).toBe('1d');
    expect(resolveJwtExpiresIn('15m')).toBe('15m');
    expect(resolveJwtExpiresIn('24h')).toBe('24h');
  });
});
