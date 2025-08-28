import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { OidcClient } from './oidc-client';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  hash_content,
  compare_hashed_content,
  ensureDefinedConfigParam,
} from '../common/functions';

import {
  JWT_REFRESH_TOKEN_SECRET_KEY,
  JWT_REFRESH_TOKEN_EXPIRATION_TIME,
  EXPIRED_REFRESH_TOKEN_ERROR_MESSAGE,
  REDIS_USER_REFRESH_TOKEN_IDENTIFIER,
  MESSAGE_BROKER_AUTH_TOKEN,
} from './constants';
import { UserJWTTokenResponseInterface } from './interfaces/user-jwt-token-response.interface';
import { UserService } from 'src/users/users.service';

/**
 * Auth service class.
 *
 * Version:1.0.0.
 *
 * This service class handles users' authentication,
 * by using passwort package.
 *
 */
@Injectable()
export class AuthService {
  /**
   * Payload object will be used to pass data to remote service,
   * using RMQ message broker.
   *
   * Version: 1.0.0
   */
  payload = {
    userId: 0,
    action: '',
    data: {},
  };

  /**
   * Initializes AuthService class.
   *
   * Version:1.0.0.
   *
   * @param {ClientProxy} client  -ClientProxy class.
   * @param {JwtService} jwtService -JwtService class.
   * @param {OidcClient} oidcClient -OidcClient class.
   * @param {ConfigService} configService  -ConfigService class.
   * @param {Redis} redisClient - redisClient class.
   */
  constructor(
    private readonly UserService: UserService,
    @Inject(MESSAGE_BROKER_AUTH_TOKEN)
    private readonly client: ClientProxy,
    private readonly jwtService: JwtService,
    private readonly oidcClient: OidcClient,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redisClient: Redis,
  ) {}

  /**
   * Validates User.
   *
   * Version:1.0.0.
   *
   * This service method communicates with users,
   * service to validate user.
   *
   * @param {string} password -User password.
   * @param {string} username -User username.
   * @param {string} email -User email address.
   * @returns {Promise<Object|null>} -Promise that resolves to either,
   * a UserEntity Object or a null.
   */
  async validateUser(
    password: string,
    username?: string,
    email?: string,
  ): Promise<Object | null> {
    let params = username
      ? { username: username, status: 1 }
      : { email: email, status: 1 };

    let userId = 0;
    const userObject = await this.UserService.findOneBy(userId, params);

    if (
      userObject &&
      (await compare_hashed_content(userObject.password, password))
    ) {
      const { password, ...user } = userObject;
      return user;
    }
    return null;
  }

  /**
   * Returns user jwt token
   *
   * Version:1.0.0.
   *
   * @param {any} user -User object.
   * @returns {Promise<UserJWTTokenResponseInterface>} -Promise that resolves to access_token object.
   */
  async googleLogin(user: any): Promise<UserJWTTokenResponseInterface> {
    // Create a signed JWT token to return to the client
    const payload = {
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  /**
   * Creates authenticated user's jwt_token.
   *
   * @Version 0.0.1
   *
   * This method generates and returns  user's JWT token from user's,
   * entity and saves refresh token into redis database.
   *
   * @param {any} user -UserEntity.
   * @returns {Promise<UserJWTTokenResponseInterface>} -Promise that resolves to user access,
   * and refresh JWT tokens.
   */
  async login(user: any): Promise<UserJWTTokenResponseInterface> {
    const payload = { username: user.username, userId: user.userId };
    const response = {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>(JWT_REFRESH_TOKEN_SECRET_KEY),
        expiresIn: this.configService.get<string>(
          JWT_REFRESH_TOKEN_EXPIRATION_TIME,
        ),
      }),
    };

    // Store refresh_token in redis database to handle it's expiry and removal
    const expiresIn =
      (this.configService.get<string>(JWT_REFRESH_TOKEN_EXPIRATION_TIME)
        ? parseInt(
            ensureDefinedConfigParam(
              this.configService.get<string>(JWT_REFRESH_TOKEN_EXPIRATION_TIME),
              JWT_REFRESH_TOKEN_EXPIRATION_TIME,
            ),
          )
        : 7) * 86400; // 7 days in seconds

    const hased_refresh_token = await hash_content(response.refresh_token);
    this.redisClient.set(
      REDIS_USER_REFRESH_TOKEN_IDENTIFIER.replaceAll('{user_id}', user.userId),
      hased_refresh_token,
      'EX',
      expiresIn,
    );
    return response;
  }

  /**
   * Returns fresh access token.
   *
   * Version:1.0.0.
   *
   * This method generates and returns new access token by using,
   * user's refresh token.
   *
   * @param {string} refresh_token -Refresh token.
   * @returns {Promise<UserJWTTokenResponseInterface|UnauthorizedException>} -Promise that resolves to,
   * either a UserJWTTokenResponseInterface or a UnauthorizedException.
   */
  async refreshToken(
    refresh_token: string,
  ): Promise<UserJWTTokenResponseInterface | UnauthorizedException> {
    const decoded = await this.jwtService.verifyAsync(refresh_token, {
      secret: this.configService.get<string>(JWT_REFRESH_TOKEN_SECRET_KEY),
    });

    const refreshToken = await this.redisClient.get(
      REDIS_USER_REFRESH_TOKEN_IDENTIFIER.replaceAll(
        '{user_id}',
        decoded.userId,
      ),
    );

    if (
      refreshToken === null ||
      (await compare_hashed_content(refreshToken, refresh_token)) === false
    ) {
      throw new UnauthorizedException(EXPIRED_REFRESH_TOKEN_ERROR_MESSAGE);
    }

    const payload = { username: decoded.username, userId: decoded.userId };
    return { access_token: this.jwtService.sign(payload) };
  }

  /**
   * Revokes user refresh token.
   *
   * Version:1.0.0.
   *
   * This method revokes refresh token for security,
   * reasons.
   *
   * @param {string} refresh_token -Refresh token.
   * @returns {Promise<boolean|UnauthorizedException>} -Promise that resolves to either boolean,
   * or a UnauthorizedException.
   */
  async revokeRefreshToken(
    refresh_token: string,
  ): Promise<boolean | UnauthorizedException> {
    const decoded = await this.jwtService.verifyAsync(refresh_token, {
      secret: this.configService.get<string>(JWT_REFRESH_TOKEN_SECRET_KEY),
    });

    let isDeleted: number = 0;
    if (decoded.userId) {
      isDeleted = await this.redisClient.del(
        REDIS_USER_REFRESH_TOKEN_IDENTIFIER.replaceAll(
          '{user_id}',
          decoded.userId,
        ),
      );
    } else {
      throw new UnauthorizedException(EXPIRED_REFRESH_TOKEN_ERROR_MESSAGE);
    }
    return isDeleted ? true : false;
  }

  /**
   * Returns google authorization url.
   *
   * Version:1.0.0.
   *
   * @param void
   * @returns {Promise<string>} -Promise that resolves to authorizationUrl.
   */
  async getGoogleAuthorizationUrl(): Promise<string> {
    const client = await this.oidcClient.getClient();
    const authorizationUrl = client.authorizationUrl();
    return authorizationUrl;
  }
}
