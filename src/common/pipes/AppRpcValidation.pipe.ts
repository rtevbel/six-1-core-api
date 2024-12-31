import { ValidationPipe, ValidationError, Injectable } from '@nestjs/common';

@Injectable()
export class AppRpcValidationPipe extends ValidationPipe {
  protected flattenValidationErrors(
    validationErrors: ValidationError[],
  ): string[] {
    return validationErrors.map(
      (error) =>
        `${error.property} has wrong value ${error.value}, ${Object.values(error.constraints || {}).join(' , ')}`,
    );
  }

  createExceptionFactory() {
    return (validationErrors: ValidationError[] = []) => {
      const errors = this.flattenValidationErrors(validationErrors);
      return { message: errors };
    };
  }
}
