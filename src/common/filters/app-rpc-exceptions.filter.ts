import {
  Catch,
  ArgumentsHost,
  RpcExceptionFilter
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from "rxjs";

/**
 * Custom exception filter to handle application's `RpcException`s.
 * 
 * @version 1.0.0
 * 
 * The `AppRpcExceptionsFilter` implements the built-in `RpcExceptionFilter`
 * and uses the `@Catch` decorator to specifically handle `RpcException`s.
 * 
 * This filter intercepts `RpcException`s thrown in the application and
 * ensures they are properly formatted before being returned.
 */
@Catch(RpcException)
export class AppRpcExceptionsFilter implements RpcExceptionFilter<RpcException> {
  
  /**
   * Handles `RpcException`s and returns them as observable errors.
   * 
   * @param {RpcException} exception - The exception instance thrown.
   * @param {ArgumentsHost} host - The arguments host, providing access to the request context.
   * @returns {Observable<any>} - An observable that emits the exception error.
   * 
   * @todo Implement logging to capture `exception.getError()` details.
   */
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    return throwError(() => exception.getError());
  }
}
