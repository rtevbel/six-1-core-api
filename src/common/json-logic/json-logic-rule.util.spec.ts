import { applyJsonLogicRule, evaluateJsonLogicRuleOptional } from './json-logic-rule.util';

describe('json-logic-rule.util', () => {
  it('applyJsonLogicRule evaluates a simple rule', () => {
    expect(
      applyJsonLogicRule({ '==': [{ var: 'token' }, 'abc'] }, { token: 'abc' }),
    ).toBe(true);
    expect(
      applyJsonLogicRule({ '==': [{ var: 'token' }, 'abc'] }, { token: 'xyz' }),
    ).toBe(false);
  });

  it('evaluateJsonLogicRuleOptional returns default when rule is absent', () => {
    expect(evaluateJsonLogicRuleOptional(null, {}, true)).toEqual({
      value: true,
      ruleApplied: false,
    });
  });
});
