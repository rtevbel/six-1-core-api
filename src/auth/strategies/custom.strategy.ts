import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { AuthService } from '../auth.service';
import {
  INVALID_CREDENTIALS_ERROR_MESSAGE,
  CUSTOM_STRATEGY_IDENTIFIER,
  EMAIL_NOT_VERIFIED_ERROR_MESSAGE,
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
   * @param req - Request data (HTTP request or RabbitMQ payload).
   * @returns {Promise<any> } -Promise that resolves to either a UnauthorizedException,
   * or a UserEntity.
   */
  async validate(req: any): Promise<any> {
    const { username, email, password } = req;
    
    // Check if username is provided and if it's an email
    // If username is an email, use it as email, otherwise use it as username
    let finalUsername: string | undefined = undefined;
    let finalEmail: string | undefined = email;

    if (username) {
      if (this.isEmail(username)) {
        // If username is actually an email, use it as email
        finalEmail = username;
      } else {
        // Otherwise, use it as username
        finalUsername = username;
      }
    }
  
    const user = await this.authService.validateUser(
      password,
      finalUsername,
      finalEmail,
    );

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_ERROR_MESSAGE);
    }

    if (user.activationKey) {
      throw new UnauthorizedException(EMAIL_NOT_VERIFIED_ERROR_MESSAGE);
    }
    
    return user;
  }

  /**
   * Checks if a string is a valid email address.
   *
   * @param {string} value - The string to check.
   * @returns {boolean} - True if the string is a valid email, false otherwise.
   */
  private isEmail(value: string): boolean {
    // Simple email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }
}
