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
export class CustomAuthGuard extends AuthGuard(CUSTOM_STRATEGY_IDENTIFIER) {}
