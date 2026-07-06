import {
  validateFieldRulesJson,
  FieldRulesValidationError,
} from './field-rules.validator';

describe('validateFieldRulesJson', () => {
  it('accepts null and empty object', () => {
    expect(validateFieldRulesJson(null)).toBeNull();
    expect(validateFieldRulesJson({})).toEqual({});
  });

  it('normalizes a single when/then rule', () => {
    expect(
      validateFieldRulesJson({
        when: { field: 'status', operator: 'eq', value: 'active' },
        then: { visible: true, readonly: false },
      }),
    ).toEqual({
      schemaVersion: 1,
      when: { field: 'status', operator: 'eq', value: 'active' },
      then: { visible: true, readonly: false },
    });
  });

  it('normalizes conditions array', () => {
    expect(
      validateFieldRulesJson({
        conditions: [
          {
            when: { field: 'type', operator: 'in', value: ['a', 'b'] },
            then: { required: true },
          },
        ],
      }),
    ).toEqual({
      schemaVersion: 1,
      conditions: [
        {
          when: { field: 'type', operator: 'in', value: ['a', 'b'] },
          then: { required: true },
        },
      ],
    });
  });

  it('rejects unknown top-level keys', () => {
    expect(() => validateFieldRulesJson({ foo: 1 })).toThrow(
      FieldRulesValidationError,
    );
  });

  it('rejects when without then', () => {
    expect(() =>
      validateFieldRulesJson({
        when: { field: 'x', operator: 'empty' },
      }),
    ).toThrow('rulesJson.then is required when when is set');
  });
});
