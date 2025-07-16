import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { LOCAL_STRATEGY_IDENTIFIER } from '../constants';

/**
 * LocalStrategy class.
 *
 * Version:1.0.0.
 *
 * This strategy class extends PassportStrategy class that uses,
 * passport-local srategy to authenticate user by username,
 * password.
 *
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(
  Strategy,
  LOCAL_STRATEGY_IDENTIFIER,
) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(username: string, password: string) {
    const user = await this.authService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
