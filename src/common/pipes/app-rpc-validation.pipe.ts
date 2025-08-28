import { ValidationPipe, ValidationError, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

/**
 * Custom validation pipe for handling RPC validation errors.
 *
 * @version 0.0.2
 *
 * The `AppRpcValidationPipe` extends the built-in `ValidationPipe`
 * to customize error messages and throw RPC exceptions.
 *
 * It overrides:
 * - `flattenValidationErrors` to format validation errors as human-readable messages.
 * - `createExceptionFactory` to transform validation errors into `RpcException` objects.
 * - Adds `transform` and `whitelist` options to ensure proper validation and transformation.
 */
@Injectable()
export class AppRpcValidationPipe extends ValidationPipe {
  /**
   * Constructor to configure the validation pipe.
   *
   * @description Enables transformation of plain objects into class instances,
   * strips out unknown properties, and forbids non-whitelisted properties.
   */
  constructor() {
    super({
      transform: true, // Automatically transform payloads to DTO instances
      whitelist: true, // Remove properties not defined in the DTO
      forbidNonWhitelisted: true, // Throw an error for unknown properties
    });
  }

  /**
   * Formats validation errors into an array of descriptive error messages.
   *
   * @param {ValidationError[]} validationErrors - Array of validation errors.
   * @returns {string[]} - Formatted error messages.
   */
  protected flattenValidationErrors(
    validationErrors: ValidationError[],
  ): string[] {
    return validationErrors.map(
      (error) =>
        `${error.property} has wrong value ${error.value}, ${Object.values(error.constraints || {}).join(' , ')}`,
    );
  }

  /**
   * Creates an exception factory that converts validation errors into an `RpcException`.
   *
   * @returns {(validationErrors: ValidationError[]) => RpcException} - A function that takes validation errors and returns an `RpcException`.
   */
  createExceptionFactory() {
    return (validationErrors: ValidationError[] = []) => {
      // Flatten validation errors into readable messages
      const errors = this.flattenValidationErrors(validationErrors);
      // Throw an RpcException with the formatted error messages
      return new RpcException({ message: errors });
    };
  }
}