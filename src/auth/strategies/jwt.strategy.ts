import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JWT_STRATEGY_IDENTIFIER } from '../constants';

/**
 * JwtStrategy class.
 *
 * @Version 0.0.1
 *
 * This strategy extends PassportStrategy with passport-jwt
 * and validates user requests using a JWT token from the
 * request header.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  JWT_STRATEGY_IDENTIFIER,
) {
  constructor() {
    // Retrieve the secret key from environment variables.
    const secretKey = process.env.JWT_SECRET_KEY;
    if (!secretKey) {
      console.log(process.env, 'process.env');
      // Throw an error if the secret key is not defined.
      throw new Error('JWT_SECRET_KEY must be defined');
    }

    // Configure the strategy with options.
    super({
      // Extract the JWT token from the Authorization header.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Ensure the token expiration is validated.
      ignoreExpiration: false,
      // Use the secret key to verify the token.
      secretOrKey: secretKey,
    });
  }

  /**
   * Validates the payload extracted from the JWT token.
   * @param Payload - The payload from the JWT token.
   * @returns An object containing the username and userId.
   */
  async validate(Payload: any) {
    return { username: Payload.username, userId: Payload.userId };
  }
}
