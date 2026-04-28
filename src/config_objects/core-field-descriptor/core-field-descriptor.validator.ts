import { validateSync, type ValidationError } from 'class-validator';

import type { CoreFieldDescriptor } from './core-field-descriptor.types';
import { CoreFieldDescriptorValidationClass } from './core-field-descriptor.schema';

/**
 * Thrown when {@link validateCoreFieldDescriptor} or batch validation fails.
 * Callers map this to `RpcException` at transport boundaries when needed.
 */
export class CoreFieldDescriptorValidationError extends Error {
  constructor(public readonly validationErrors: ValidationError[]) {
    super('CoreFieldDescriptor validation failed');
    this.name = 'CoreFieldDescriptorValidationError';
  }
}

function toValidationInstance(
  plain: unknown,
): CoreFieldDescriptorValidationClass {
  if (typeof plain !== 'object' || plain === null || Array.isArray(plain)) {
    return Object.assign(new CoreFieldDescriptorValidationClass(), {});
  }
  return Object.assign(new CoreFieldDescriptorValidationClass(), plain);
}

/**
 * Validates an unknown plain value and returns a {@link CoreFieldDescriptor}.
 * Strips properties not declared on {@link CoreFieldDescriptorValidationClass} when
 * whitelist validation runs.
 */
export function validateCoreFieldDescriptor(
  plain: unknown,
): CoreFieldDescriptor {
  const instance = toValidationInstance(plain);

  // Whitelist strips undeclared keys without failing the whole payload (strict payload
  // shapes for views/panels may use forbidNonWhitelisted separately).
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    throw new CoreFieldDescriptorValidationError(errors);
  }

  return instance as unknown as CoreFieldDescriptor;
}

/**
 * Validates an array of descriptor-like objects; throws on first invalid entry.
 */
export function validateCoreFieldDescriptors(
  items: unknown[],
): CoreFieldDescriptor[] {
  if (!Array.isArray(items)) {
    throw new CoreFieldDescriptorValidationError([
      {
        property: 'items',
        constraints: { isArray: 'must be an array' },
      } as ValidationError,
    ]);
  }
  return items.map((item) => validateCoreFieldDescriptor(item));
}
