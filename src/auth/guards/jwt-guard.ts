import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { JWT_STRATEGY_IDENTIFIER } from '../constants';

/**
 * JwtAuthGuard class.
 *
 * Version:1.0.0.
 *
 * JwtAuthGuard class extends AuthGuard that uses,
 * jwt strategy to authenticate user requests.
 */
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_IDENTIFIER) {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
