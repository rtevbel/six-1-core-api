import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openidconnect';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GOOGLE_OIDC_IDENTIFIER } from '../constants';

/**
 * OidcStrategy class.
 *
 * Version:1.0.0.
 *
 * This OidcStrategy extends PassportStrategy class that,
 * uses passport-openidconnect strategy to authenticate user,
 * using Google auhentication flow.
 *
 */
@Injectable()
export class OidcStrategy extends PassportStrategy(
  Strategy,
  GOOGLE_OIDC_IDENTIFIER,
) {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super({
      issuer:
        configService.get<string>('GOOGLE_ISSUER') ||
        'https://accounts.google.com',
      authorizationURL:
        configService.get<string>('GOOGLE_AUTHORIZATION_URL') ||
        'https://accounts.google.com/o/oauth2/auth',
      tokenURL:
        configService.get<string>('GOOGLE_TOKEN_URL') ||
        'https://oauth2.googleapis.com/token',
      userInfoURL:
        configService.get<string>('GOOGLE_USERINFO_URL') ||
        'https://www.googleapis.com/oauth2/v3/userinfo',
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ||
        'your-google-client-id',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ||
        'your-google-client-secret',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3005/auth/callback',
      scope: ['openid', 'profile', 'email'],
      //responseType:'code', // Use 'code' for authorization code flow
      passReqToCallback: false, // Ensure we can control the request object
    });
  }

  async validate(
    issuer: string,
    sub: string,
    profile: any,
    accessToken: string,
    refreshToken: string,
    done: Function,
  ) {
    // Create JWT payload
    const payload = {
      sub: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
    };

    // Sign the JWT
    const jwt = this.jwtService.sign(payload);

    // Return JWT instead of using session
    done(null, { jwt });
  }
}
