import { RpcException } from '@nestjs/microservices';

export type ContextSchemaValidationResult = {
  valid: boolean;
  errors: Array<Record<string, unknown>>;
};

/**
 * Ensures a JSON Schema document compiles under AJV (authoring guard).
 */
export function assertCompilableJsonSchema(
  ajv: { compile: (schema: object) => unknown },
  schema: Record<string, unknown> | null | undefined,
): void {
  if (schema === null || schema === undefined) {
    return;
  }
  if (typeof schema !== 'object' || Array.isArray(schema)) {
    throw new RpcException('contextSchema must be a JSON object.');
  }

  try {
    ajv.compile(schema);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON Schema';
    throw new RpcException(`contextSchema is invalid: ${message}`);
  }
}

/**
 * Validates a process start context payload against a template schema.
 */
export function validateContextAgainstSchema(
  ajv: { compile: (schema: object) => (data: unknown) => boolean; errors?: unknown },
  schema: Record<string, unknown>,
  context: Record<string, unknown>,
): ContextSchemaValidationResult {
  const validate = ajv.compile(schema) as {
    (data: unknown): boolean;
    errors?: Array<Record<string, unknown>> | null;
  };
  const valid = validate(context);
  return {
    valid: !!valid,
    errors: valid ? [] : (validate.errors ?? []),
  };
}
