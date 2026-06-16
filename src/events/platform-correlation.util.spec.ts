import {
  readOptionalCorrelationId,
  resolveCorrelationId,
} from './platform-correlation.util';

describe('platform-correlation.util', () => {
  it('prefers explicit correlation id', () => {
    expect(resolveCorrelationId('abc-123', 'fallback')).toBe('abc-123');
  });

  it('uses fallback when explicit is empty', () => {
    expect(resolveCorrelationId('', 'fallback-id')).toBe('fallback-id');
  });

  it('generates uuid when both are missing', () => {
    const id = resolveCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('reads optional correlation id', () => {
    expect(readOptionalCorrelationId('  corr  ')).toBe('corr');
    expect(readOptionalCorrelationId('')).toBeUndefined();
  });
});
