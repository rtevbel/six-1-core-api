import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Payload } from '@nestjs/microservices';
import { AuthService } from '../auth.service';
import {
  INVALID_CREDENTIALS_ERROR_MESSAGE,
  CUSTOM_STRATEGY_IDENTIFIER,
} from '../constants';

/**
 * Custom authentication strategy class.
 *
 * Version:1.0.0.
 *
 * This class custom strategy class extends password package's,
 * PassportStrategy class with Strategy and validate client authentication,
 * request by using authService's validateUser method.
 */
@Injectable()
export class CustomStrategy extends PassportStrategy(
  Strategy,
  CUSTOM_STRATEGY_IDENTIFIER,
) {
  /**
   * Initializes CustomStrategy class.
   *
   * Version:1.0.0.
   *
   * @param {AuthService} authService -Authentication service class.
   */
  constructor(private readonly authService: AuthService) {
    super();
  }

  /**
   * Validates user authentication request.
   *
   * Version.1.0.0.
   *
   * This strategy class' validate method validates,
   * user by using authService class's validateUser method.
   *
   * @param {Payload} req -Request data.
   * @returns {Promise<any> } -Promise that resolves to either a UnauthorizedException,
   * or a UserEntity.
   */
  async validate(@Payload() req: any): Promise<any> {
    const { username, email, password } = req;
    const user = await this.authService.validateUser(password, username, email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_ERROR_MESSAGE);
    }
    return user;
  }
}
