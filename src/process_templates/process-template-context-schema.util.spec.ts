import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { RpcException } from '@nestjs/microservices';
import {
  assertCompilableJsonSchema,
  validateContextAgainstSchema,
} from './process-template-context-schema.util';

function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

describe('assertCompilableJsonSchema', () => {
  const ajv = createAjv();

  it('accepts undefined/null schema', () => {
    expect(() => assertCompilableJsonSchema(ajv, undefined)).not.toThrow();
    expect(() => assertCompilableJsonSchema(ajv, null)).not.toThrow();
  });

  it('accepts a compilable schema', () => {
    expect(() =>
      assertCompilableJsonSchema(ajv, {
        type: 'object',
        properties: { customerId: { type: 'integer' } },
        required: ['customerId'],
      }),
    ).not.toThrow();
  });

  it('rejects non-object schema', () => {
    expect(() => assertCompilableJsonSchema(ajv, [] as unknown as object)).toThrow(
      RpcException,
    );
  });
});

describe('validateContextAgainstSchema', () => {
  const ajv = createAjv();
  const schema = {
    type: 'object',
    properties: { customerId: { type: 'integer', minimum: 1 } },
    required: ['customerId'],
    additionalProperties: false,
  };

  it('returns valid for matching context', () => {
    expect(
      validateContextAgainstSchema(ajv, schema, { customerId: 42 }),
    ).toEqual({ valid: true, errors: [] });
  });

  it('returns errors for invalid context', () => {
    const result = validateContextAgainstSchema(ajv, schema, {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
