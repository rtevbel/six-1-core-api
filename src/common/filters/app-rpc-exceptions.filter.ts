import {
  Catch,
  ArgumentsHost,
  RpcExceptionFilter,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * Custom exception filter to handle application's `RpcException`s, TypeORM errors, and `UnauthorizedException`.
 *
 * @version 0.0.1
 *
 * The `AppRpcExceptionsFilter` implements the built-in `RpcExceptionFilter`
 * and uses the `@Catch` decorator to specifically handle `RpcException`s, TypeORM errors, and `UnauthorizedException`.
 *
 * This filter intercepts exceptions thrown in the application and ensures
 * they are properly formatted before being returned.
 */
@Catch()
export class AppRpcExceptionsFilter
  implements RpcExceptionFilter<RpcException>
{
  /**
   * Handles `RpcException`s, TypeORM errors, and `UnauthorizedException`, returning them as observable errors.
   *
   * @param {RpcException | QueryFailedError | EntityNotFoundError | UnauthorizedException} exception - The exception instance thrown.
   * @param {ArgumentsHost} host - The arguments host, providing access to the request context.
   * @returns {Observable<any>} - An observable that emits the formatted exception error.
   */
  catch(
    exception:
      | RpcException
      | QueryFailedError
      | EntityNotFoundError
      | UnauthorizedException
      | ForbiddenException,
    host: ArgumentsHost,
  ): Observable<any> {
    let errorResponse: any;

    // Handle RpcException
    if (exception instanceof RpcException) {
      errorResponse = exception.getError();
    }
    // Handle TypeORM QueryFailedError
    else if (exception instanceof QueryFailedError) {
      errorResponse = {
        statusCode: 500,
        message: exception.message
          ? `Database error: ${exception.message}`
          : 'An unexpected database error occurred',
        details: exception.message,
      };
    }
    // Handle TypeORM EntityNotFoundError
    else if (exception instanceof EntityNotFoundError) {
      errorResponse = {
        statusCode: 404,
        message: exception.message
          ? `Entity not found: ${exception.message}`
          : 'The requested entity was not found',
        details: exception.message,
      };
    }
    // Handle UnauthorizedException
    else if (exception instanceof UnauthorizedException) {
      errorResponse = {
        statusCode: 401,
        message: exception.message
          ? `Unauthorized: ${exception.message}`
          : 'Access is denied due to invalid credentials',
        details: exception.message,
      };
    } else if (exception instanceof ForbiddenException) {
      errorResponse = {
        statusCode: 403,
        message: exception.message
          ? exception.message
          : 'Insufficient permissions',
        details: exception.message,
      };
    } else {
      // Fallback for unknown exceptions
      errorResponse = {
        statusCode: 500,
        message: 'An unexpected error occurred',
      };
    }

    return throwError(() => errorResponse);
  }
}
