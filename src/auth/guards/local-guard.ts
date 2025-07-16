import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { LOCAL_STRATEGY_IDENTIFIER } from '../constants';

/**
 * LocalAuthGuard class.
 *
 * Version:1.0.0.
 *
 * This LocalAuthGuard class extends AuthGuard class that,
 * uses LOCAL_STRATEGY to authenticate and protect the routes.
 */
export class LocalAuthGuard extends AuthGuard(LOCAL_STRATEGY_IDENTIFIER) {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
