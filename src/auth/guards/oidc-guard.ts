import { AuthGuard } from '@nestjs/passport';
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { GOOGLE_OIDC_IDENTIFIER } from '../constants';

/**
 * OidcAuthGuard class.
 *
 * Version:1.0.0.
 *
 * This OidcAuthGuard class extends AuthGuard class that,
 * uses GOOGLE_OIDC strategy to authenticate the user request.
 */
@Injectable()
export class OidcAuthGuard extends AuthGuard(GOOGLE_OIDC_IDENTIFIER) {
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
