import { ValidationPipe, ValidationError, Injectable } from '@nestjs/common';
import { RpcException } from "@nestjs/microservices";

/**
 * Custom validation pipe for handling RPC validation errors.
 * 
 * @version 1.0.0
 * 
 * The `AppRpcValidationPipe` extends the built-in `ValidationPipe`
 * to customize error messages and throw RPC exceptions.
 * 
 * It overrides:
 * - `flattenValidationErrors` to format validation errors as human-readable messages.
 * - `createExceptionFactory` to transform validation errors into `RpcException` objects.
 */
@Injectable()
export class AppRpcValidationPipe extends ValidationPipe {
  
  /**
   * Formats validation errors into an array of descriptive error messages.
   * 
   * @param {ValidationError[]} validationErrors - Array of validation errors.
   * @returns {string[]} - Formatted error messages.
   */
  protected flattenValidationErrors(validationErrors: ValidationError[]): string[] {
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
      const errors = this.flattenValidationErrors(validationErrors);
      return new RpcException({ message: errors });
    };
  }
}
