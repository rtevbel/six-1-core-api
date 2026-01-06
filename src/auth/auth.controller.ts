import {
  Controller,
  UseGuards,
  UseFilters,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomAuthGuard } from './guards/custom-auth.guard';
import { AppRpcExceptionsFilter } from '../common/filters/app-rpc-exceptions.filter';
import { OidcClient } from './oidc-client';
import { JwtService } from '@nestjs/jwt';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  V0_1_AUTH_LOGIN_MESSAG_PATTERN,
  V0_1_AUTH_REFRESH_TOKEN_MESSAG_PATTERN,
  V0_1_AUTH_REVOKE_REFRESH_TOKEN_MESSAG_PATTERN,
  V0_1_AUTH_USER_PROFILE_MESSAG_PATTERN,
} from './constants';
import { UserJWTTokenResponseInterface } from './interfaces/user-jwt-token-response.interface';

/**
 * Authentication controller class handles,
 * users' all authentication gRPC calls.
 *
 * @Version 0.0.1
 */
@Controller()
@UseFilters(AppRpcExceptionsFilter)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oidcClient: OidcClient,
    private readonly jwtService: JwtService,
  ) {}

  /*@Get('google')
  //@UseGuards(OidcAuthGuard)
  async googleAuth(@Res() res: Response) {
    const authorizationUrl = await this.authService.getGoogleAuthorizationUrl();
    res.redirect(authorizationUrl);
    // Redirects to Google for authentication
  }

  @Get('callback')
  //@UseGuards(OidcAuthGuard)
  async googleAuthRedirect(@Query('code') code: string, @Res() res: Response) {
    const client = await this.oidcClient.getClient();
    const tokenSet = await client.callback(
      'http://localhost:3005/auth/callback',
      { code },
    );
    const userInfo = await client.userinfo(tokenSet.access_token ?? '');

    // Generate JWT
    const jwtPayload = {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    };
    const jwtToken = this.jwtService.sign(jwtPayload);

    // Send JWT to client
    res.json({ accessToken: jwtToken });
  }*/

  /**
   * Authenticates user by using,
   * passport package's custom strategy.
   *
   * @param {any} req -Request object contaning authenticated user's details.
   * @returns {Promise<UserJWTTokenResponseInterface>} -Promise tha resolves to,
   * UserJWTTokenResponseInterface.
   */
  @MessagePattern(V0_1_AUTH_LOGIN_MESSAG_PATTERN)
  @UseGuards(CustomAuthGuard)
  login(@Body() req: any): Promise<UserJWTTokenResponseInterface> {
    return this.authService.login(req.user);
  }

  /**
   * Generates and returns JWT access_token.
   *
   * @Version 0.0.1
   *
   * This method generates and returns user's,
   * JWT access_token by using the JWT refresh token.
   *
   * @param {string} refresh_token -User's JWT refresh token.
   * @returns {Promise<UserJWTTokenResponseInterface|UnauthorizedException>} -Promise,
   * that resolves to either UserJWTTokenResponseInterface or a UnauthorizedException.
   */
  @MessagePattern(V0_1_AUTH_REFRESH_TOKEN_MESSAG_PATTERN)
  refreshToken(
    @Payload() refresh_token: string,
  ): Promise<UserJWTTokenResponseInterface | UnauthorizedException> {
    return this.authService.refreshToken(refresh_token);
  }

  /**
   * Revokes refresh token.
   *
   * @Version 0.0.1
   *
   * This method revokes user's JWT refresh token by,
   * using authService class for security reasons.
   *
   * @param {string} refresh_token -User's JWT refresh token.
   * @returns {Promise<boolean|UnauthorizedException>} - Promise that resolves to,
   * either boolean value or a UnauthorizedException.
   */
  @MessagePattern(V0_1_AUTH_REVOKE_REFRESH_TOKEN_MESSAG_PATTERN)
  revokeRefreshToken(
    @Payload() refresh_token: string,
  ): Promise<boolean | UnauthorizedException> {
    return this.authService.revokeRefreshToken(refresh_token);
  }

  /**
   * Returns user's profile.
   *
   * @Version 0.0.1
   *
   * This method returns authenticated user details including roles and permissions.
   *
   * @param {any} payload -Payload object containing authenticated user' details.
   * @returns {Promise<Object>} -Returns user profile object with userId, roles, and permissions.
   */
  @MessagePattern(V0_1_AUTH_USER_PROFILE_MESSAG_PATTERN)
  async getProfile(
    @Payload()
    payload: {
      userId?: number;
      tenantUserId?: number;
    },
  ): Promise<object> {
    const { userId, tenantUserId } = payload;

    if (!userId) {
      throw new UnauthorizedException('User ID not found in request');
    }

    return await this.authService.getProfile(userId, tenantUserId);
  }
}
