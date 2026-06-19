import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CUSTOM_STRATEGY_IDENTIFIER } from '../constants';

/**
 * CustomAuthGuard class.
 *
 * Version:1.0.0.
 *
 * CustomAuthGuard class extends AuthGuard that uses,
 * custom strategy to authenticate user.
 */
export class CustomAuthGuard extends AuthGuard(CUSTOM_STRATEGY_IDENTIFIER) {
  getRequest(context: ExecutionContext) {
    if (context.getType() === 'rpc') {
      return context.switchToRpc().getData();
    }

    return context.switchToHttp().getRequest();
  }
}
