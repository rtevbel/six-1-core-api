import { evaluateCompletionRule } from './completion-rule.util';

describe('evaluateCompletionRule', () => {
  it('accepts non-empty payload at DRAFT', () => {
    const result = evaluateCompletionRule(
      { type: 'payload_valid' },
      { payload: { name: 'Invoice A' }, status: 'DRAFT' },
    );
    expect(result.valid).toBe(true);
  });

  it('rejects empty payload', () => {
    const result = evaluateCompletionRule(
      { type: 'payload_valid' },
      { payload: {}, status: 'DRAFT' },
    );
    expect(result.valid).toBe(false);
  });

  it('enforces minStatus submitted as PUBLISHED', () => {
    const fail = evaluateCompletionRule(
      { type: 'payload_valid', minStatus: 'submitted' },
      { payload: { x: 1 }, status: 'DRAFT' },
    );
    expect(fail.valid).toBe(false);

    const pass = evaluateCompletionRule(
      { type: 'payload_valid', minStatus: 'submitted' },
      { payload: { x: 1 }, status: 'PUBLISHED' },
    );
    expect(pass.valid).toBe(true);
  });
});
